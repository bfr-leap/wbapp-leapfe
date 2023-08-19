/**
 *
 * This TypeScript file contains functions related to generating and narrating race event notes based on telemetry
 * data from a simulated racing session. The generateNoteText function processes telemetry data, overtaking
 * events, and lap information to create concise broadcast-style notes about the race events and driver
 * positions. The narrate function takes these notes and augments them with opinionated commentary in the
 * style of a bold and brash broadcaster, adding colorful remarks to the race narrative.
 *
 */

import {
    ReplayNote,
    PositionChangeEvent,
    EpochTelemetry,
    DriverTelemetryDatum,
} from './telemetry-types';
import {
    LapChartData,
    SimsessionResults,
} from '../../src/iracing-endpoints.js';
import { createCompletion } from '../openai/openai-endpoints.js';

// this is a prompt to try later:::
// The following broadcast notes:
//     We are looking at Alexander Schanna running P 15
//     On lap 0, Alexander Schanna lost position to Jacob Bieser
//     On lap 0, Alexander Schanna lost position to Matthew Walters2
//     On lap 0, Alexander Schanna lost position to Jesus Altuve
//     On lap 0, Alexander Schanna lost position to Franky Franchicha
//     On lap 0, Alexander Schanna lost position to Grigor Georgiev
//     On lap 0, Alexander Schanna lost position to Frank Bieser
//     On lap 0, Alexander Schanna lost position to Yair Montiel
//     On lap 0, Alexander Schanna lost position to David Robson2
//     On lap 1, Alexander Schanna lost position to Fabian Bouwmeester
//     On lap 2, Alexander Schanna lost position to Yair Montiel
//     On lap 0, Alexander Schanna overtook Matthew Walters2
//     On lap 0, Alexander Schanna overtook Jesus Altuve
//     On lap 1, Alexander Schanna overtook Jesus Altuve
//     On lap 1, Alexander Schanna overtook David Robson2
//     On lap 1, Alexander Schanna overtook Yair Montiel
//     Currently, Alexander Schanna is bringing the fight to Troy Banks from position 15

// This is what Jeremy Clarkson would say in 200 characters skipping details for brevity but keeping his particular style:

async function narrate(notes: ReplayNote[], lapChartData: LapChartData) {
    for (let n of notes) {
        let eventPrompt = [
            `The following broadcast notes:`,
            ...n.note.map((t) => `    ${t}`),
            ``,
            //`This is what a succinct, opinionated, bold, brash, and often controversial broadcaster can say in 3 seconds skipping details for brevity:`,
            `This is what Jeremy Clarkson would say in 200 characters skipping details for brevity but keeping his particular style:`,
        ];

        let newComment = await createCompletion(eventPrompt.join('\n'));

        n.note.push(newComment);
    }
}

export async function generateNoteText(
    notes: ReplayNote[],
    overtakes: PositionChangeEvent[],
    lapChartData: LapChartData,
    telemetry: EpochTelemetry,
    driverNames: { [name: number]: string },
    simsessionResults: SimsessionResults
) {
    let driverLastLookAtMap: { [name: string]: number } = {};

    let first = true;
    let lastLap = 0;

    for (let n of notes) {
        let lastLookAt = driverLastLookAtMap[n.lookAt] || 0;

        if (first) {
            n.note.push('race starts');
            first = false;
        }

        if (n.note.length === 1 && n.note[0] === 'finished') {
            let p = simsessionResults.results.find(
                (v) => v.cust_id === n.lookAt
            ).position;
            n.note.push(`${driverNames[n.lookAt]} finishes position ${p}`);
            continue;
        }

        let liveTelemetry: {
            time: number;
            data: DriverTelemetryDatum[];
        } = telemetry.epochList.find((e) => e.time > n.time);

        let p = 0;
        let currentLap = Math.floor(
            liveTelemetry.data.find((d, i) => {
                p = i + 1;
                return d.driverId === n.lookAt;
            }).perc + 1
        );

        let lastSeenLap = Math.floor(
            (telemetry.epochList
                .find((e) => e.time > lastLookAt)
                ?.data.find((d) => d.driverId === n.lookAt)?.perc || 0) + 1
        );

        let lapEventMap: { [name: string]: string } = {
            'off track': 'went off track',
            'car contact': 'made car contact',
            'black flag': 'got a black flag',
            contact: 'had a collision',
            tow: 'had to tow his car',
        };

        let lapEvents: string[] =
            lapChartData.chunk_info
                .filter(
                    (c) =>
                        c.cust_id === n.lookAt &&
                        c.lap_number >= lastSeenLap &&
                        c.lap_number < currentLap
                )
                ?.map(
                    (c) =>
                        `On lap ${c.lap_number}, ${
                            driverNames[n.lookAt]
                        } ${c.lap_events
                            .filter(
                                (e) => e !== 'invalid' && e !== 'discontinuity'
                            )
                            .map((e) => lapEventMap[e] || e)
                            .join(', ')}`
                ) || [];

        for (let e of lapEvents.filter(
            (le) => le.length > `On lap 100, ${driverNames[n.lookAt]} `.length
        )) {
            n.note.push(e);
        }

        let pastPositiveMoves = overtakes.filter(
            (o) =>
                o.time > lastLookAt &&
                o.time < n.time &&
                o.directDriverId === n.lookAt
        );

        let pastNegativeMoves = overtakes.filter(
            (o) =>
                o.time > lastLookAt &&
                o.time < n.time &&
                o.indirectDriverId === n.lookAt
        );

        let currentOvertakes = overtakes.filter(
            (o) =>
                o.time >= n.time &&
                o.time <= n.time + 60 * 12 &&
                o.directDriverId === n.lookAt
        );

        let currentNegativeMoves = overtakes.filter(
            (o) =>
                o.time >= n.time &&
                o.time <= n.time + 60 * 12 &&
                o.indirectDriverId === n.lookAt
        );

        for (let o of pastNegativeMoves) {
            let lap = Math.floor(o.perc) + 1;
            n.note.push(
                `On lap ${lap}, ${
                    driverNames[o.indirectDriverId]
                } lost position to ${driverNames[o.directDriverId]}`
            );
        }

        for (let o of pastPositiveMoves) {
            let lap = Math.floor(o.perc) + 1;
            n.note.push(
                `On lap ${lap}, ${driverNames[o.directDriverId]} overtook ${
                    driverNames[o.indirectDriverId]
                }`
            );
        }

        if (currentLap !== lastLap) {
            n.note.push(
                `We are on lap ${currentLap} looking at ${
                    driverNames[n.lookAt]
                } running P ${p}`
            );
        } else {
            n.note.push(
                `We are looking at ${driverNames[n.lookAt]} running P ${p}`
            );
        }

        for (let o of currentOvertakes) {
            n.note.push(
                `Currently, ${driverNames[o.directDriverId]} is overtaking ${
                    driverNames[o.indirectDriverId]
                } from position ${p}`
            );
        }

        for (let o of currentNegativeMoves) {
            n.note.push(
                `Currently, ${
                    driverNames[o.indirectDriverId]
                } loses position to ${driverNames[o.directDriverId]}`
            );
        }

        if (n.note.length < 2) {
            if (p !== 1) {
                if (_staticComments.length > 2) {
                    let i = Math.floor(
                        Math.random() * _staticComments.length - 1
                    );
                    n.note.push(
                        `${driverNames[n.lookAt]}${_staticComments[i]}`
                    );

                    _staticComments = _staticComments.filter(
                        (s, idx) => idx !== i
                    );
                }
            } else {
                if (_firstPlaceStaticComments.length > 2) {
                    let i = Math.floor(
                        Math.random() * _firstPlaceStaticComments.length - 1
                    );
                    n.note.push(
                        `${driverNames[n.lookAt]}${
                            _firstPlaceStaticComments[i]
                        }`
                    );

                    _firstPlaceStaticComments =
                        _firstPlaceStaticComments.filter((s, idx) => idx !== i);
                }
            }
            n.note.push(
                `${driverNames[n.lookAt]} is holding on to position ${p}`
            );
        }

        driverLastLookAtMap[n.lookAt] = n.time;
        lastLap = currentLap;
    }

    await narrate(notes, lapChartData);
}

let _staticComments: string[] = [
    ', treating this race like a Sunday drive',
    ', changing positions like a garden gnome on the track',
    ', has a magnetic attraction to that position',
    `, reminding us a bit of watching paint dry`,
    `, takes a vow of positional celibacy`,
    `, unlike a shark that constantly moves forward to survive, has been more like a well-fed house cat`,
    `, plans to make a move... eventually, maybe...`,
    ', firmly holding their position like a guardian at the gates of victory.',
    ', in a race of their own, where the competition seems to be in a distant universe.',
    ", the racetrack's zen master of 'stay put.'",
    ", proving that they've found the perfect racing equilibrium - no one's passing, no one's overtaking.",
    ", showing us that sometimes, it's not about going fast; it's about staying still... very still.",
    ', the immovable object on the racetrack.',
    ", racing like they've discovered the secret of perpetual motion... or lack thereof.",
    ", taking 'no man's land' to a whole new level.",
    ", the undisputed champion of the 'No Change Challenge.'",
    ', where speed is a foreign concept, and inertia is their co-pilot.',
    ", proving that 'standstill' can be a legitimate racing strategy.",
    ', the master of the stationary art of racing.',
    ', making the racetrack look like a parking lot.',
    ', driving with the patience of a saint and the speed of a snail.',
    ', giving the track an eerie sense of tranquility.',
    ', where the racing action is as lively as a library at midnight.',
    ", showing us that in the world of racing, sometimes, 'park' is the word.",
    ", racing like they've forgotten they're in a race.",
    ', the Picasso of staying in one place.',
    ", proving that they've mastered the art of racing in 'pause' mode.",
    ", the track's resident speed bump.",
    ", reminding us that in some races, 'zero' is the magic number.",
    ", racing like they're in a perpetual state of 'wait and see.'",
    ", showing us that sometimes, it's better to be a spectator in your own race.",
    ", the reigning king of 'Hold Your Ground' racing.",
    ', racing with the determination of a glacier.',
    ', where the racetrack becomes a shrine to stillness.',
    ", making every other driver look like they're on a conveyor belt.",
    ", racing like they're allergic to passing or being passed.",
    ", proving that 'status quo' can be a viable racing strategy.",
    ", the racetrack's living embodiment of 'staying power.'",
    ', where the excitement level is at an all-time low, and they like it that way.',
    ", racing like they've signed an invisible contract to remain in place.",
    ', making the racetrack feel like a tranquil oasis in a world of chaos.',
    ", showing us that in their world, 'change' is just a five-letter word.",
    ", the undisputed master of 'zero-sum racing.'",
    ", racing like they're on a quest to discover the meaning of 'standstill.'",
    ", where the concept of 'motion' seems to have taken a coffee break.",
    ", the racetrack's eternal anchor.",
    ", reminding us that in their universe, 'steady' is the name of the game.",
    ', the guardian of their lane, the protector of their position.',
    ', racing with the precision of a statue.',
    ", proving that in their world, 'stagnation' equals 'perfection.'",
    ", where the racing excitement level is somewhere between 'zero' and 'zzz.'",
    ", showing us that sometimes, 'move over' is just a suggestion.",
    ", the racetrack's resident 'stay put' expert.",
    ", racing like they're waiting for a bus that never comes.",
    ", the reigning champion of 'no-passing zones.'",
    ', where the racetrack turns into a scenic drive.',
    ", reminding us that in racing, 'still' is a state of mind.",
    ', proving that sometimes, the most exciting thing is not moving at all.',
    ', racing with the patience of a saint and the speed of a sloth.',
    ', making the racetrack feel like a traffic jam at rush hour.',
    ", showing us that in their world, 'stand' is the first part of 'standard.'",
    ", the master of 'holding the line.'",
    ", racing like they've discovered the art of 'being there.'",
    ", where the excitement level is somewhere between 'idle' and 'still.'",
    ", reminding us that sometimes, 'maintain' is a valid racing strategy.",
    ", the racetrack's resident 'no-change zone' champion.",
    ", proving that sometimes, 'motionless' is the fastest way forward.",
    ", racing like they're on a quest for the world's slowest lap time.",
    ', where the racetrack becomes a sanctuary of tranquility.',
    ", showing us that sometimes, 'no action' is the best action.",
    ', the guardian of the status quo.',
    ', racing with the grace of a glacier.',
    ", reminding us that in racing, 'stillness' can be a strategy.",
    ", where 'steady' is the name of the game, and they're the reigning champion.",
    ', making the racetrack look like a parking lot during rush hour.',
    ", showing us that sometimes, 'go' is overrated.",
    ", the racetrack's undisputed 'stay put' maestro.",
    ", proving that in racing, 'no change' can be a winning formula.",
    ", racing like they've discovered the art of 'staying in one place.'",
    ", where the excitement level is as low as a snail's crawl.",
    ", reminding us that sometimes, 'still' is the path to glory.",
    ", the master of 'keeping it steady.'",
    ', racing with the determination of a tortoise.',
    ", proving that in their world, 'zero' is the magic number.",
    ', where the racetrack feels like a time capsule.',
    ", showing us that sometimes, 'stand firm' is the way to go.",
    ', the guardian of their own lane, the keeper of their own pace.',
    ", reminding us that sometimes, 'pause' can be a legitimate racing strategy.",
    ', where the racing action is as lively as a library during a power outage.',
    ", showing us that in their world, 'still' is synonymous with 'winning.'",
    ", the racetrack's reigning 'no-change' champion.",
    ", proving that in racing, 'stay' can be the new 'go.'",
    ', racing with the precision of a sculpture.',
    ", reminding us that sometimes, 'stand your ground' is the key to victory.",
    ', where the racetrack becomes a sanctuary of solitude.',
    ", showing us that sometimes, 'unchanged' is the way to fame.",
    ', the guardian of their own position, the defender of their lane.',
    ", racing like they're on a quest to master the art of 'stillness.'",
    ", proving that sometimes, 'no action' can be a winning strategy.",
    ", the racetrack's undisputed 'no-change zone' virtuoso.",
    ', racing with the patience of a saint and the speed of a glacier.',
    ", reminding us that sometimes, 'motionless' is the fastest way forward.",
    ", where the excitement level is somewhere between 'standby' and 'rest.'",
    ", showing us that in racing, 'maintain' can be the path to victory.",
    ", the master of 'keeping it still.'",
    ', racing with the determination of a statue.',
];

let _firstPlaceStaticComments: string[] = [
    ", at the wheel.  Ah, look at that! Our front-runner, the king of the racetrack, the Sultan of Speed, or as I like to call them, the 'Keeper of First Place.' They've built a fortress at the front, and they're defending it like it's the last piece of pie at a family gathering.",
    ", at the wheel.  Well, ladies and gentlemen, we've got a driver up there who's grabbed first place and is clinging to it like their life depends on it. They've put a 'No Entry' sign at the front of the track, and anyone trying to overtake is met with a virtual moat filled with hot engine oil.",
    ", at the wheel.  This driver must have the race lead on a leash. 'Come on, first place, let's go for a walk.' They're not just leading; they're practically giving the rest of the field a masterclass in 'How to Be a Human Roadblock 101.'",
    ", at the wheel.  It's like this driver is auditioning for a role in a high-speed action movie, and they're playing the hero, of course. 'No villains shall pass!' They've even got a cape... well, a racing suit, but close enough.",
    ", at the wheel.  First place, where every other driver just gets a postcard saying, 'Wish you were here.'",
    ", at the wheel.  They've locked onto first place like a heat-seeking missile, and there's no shaking 'em loose!",
    ', at the wheel.  This driver is like a toll booth on the road to victory – pay the price or find another route.',
    ", at the wheel.  In first place, they're writing their own checkered flag story.",
    ", at the wheel.  The only thing that's going to take first place from this driver is a direct meteor strike.",
    ", showing us that speed is not just a number; it's an attitude.",
    ', the reigning monarch of the racetrack!',
    ', turning every corner into a personal victory lap.',
    ', the road warrior, taking no prisoners.',
    ", proving that 'fast and furious' isn't just a movie title.",
    ', a force of nature on four wheels.',
    ", giving the competition a lesson in 'How to Chase My Taillights.'",
    ', racing with the precision of a Swiss watch.',
    ', where speed meets style.',
    ', rewriting the record books, one lap at a time.',
    ', making every other driver eat their dust.',
    ', like a shark in a sea of minnows.',
    ', painting the track with their tire marks.',
    ', making the asphalt bow down to their will.',
    ", proving that winning is not a sometimes thing; it's an all-the-time thing.",
    ', making the racetrack their personal playground.',
    ', the master of the rubber-burning symphony.',
    ', where horsepower meets destiny.',
    ", showing us that legends aren't born; they're driven.",
    ", the track's answer to a sonic boom.",
    ', the racing equivalent of a rockstar.',
    ', turning adrenaline into victories.',
    ", driving so fast, even the speedometer can't keep up.",
    ', racing like they have a jet engine under the hood.',
    ", setting the standard for 'pedal to the metal.'",
    ", the road's greatest gladiator.",
    ', proving that when the going gets tough, the tough hit the gas pedal.',
    ", the racing world's undefeated champion.",
    ', where ambition meets asphalt.',
    ", showing us that winning isn't just a possibility; it's an inevitability.",
    ", the racetrack's guardian angel.",
    ", the track's perpetual pole-sitter.",
    ', making every lap look effortless.',
    ", where speed isn't a skill; it's a superpower.",
    ', like a cheetah on wheels.',
    ", racing like they're on a mission from the car gods.",
    ', leaving a trail of awe-struck competitors.',
    ', turning asphalt into their personal red carpet.',
    ", the racetrack's fearless leader.",
    ', driving with the heart of a lion.',
    ', proving that speed and strategy go hand in hand.',
    ', where every lap is a lesson in excellence.',
    ', turning ordinary roads into legends.',
    ", the racetrack's ultimate thrill-seeker.",
    ', making every race an unforgettable spectacle.',
    ", the road's undisputed kingpin.",
    ", racing like there's no tomorrow.",
    ', turning horsepower into heroism.',
    ", the track's indomitable force.",
    ', where dreams are measured in RPM.',
    ', leaving competitors in the dust like a tornado.',
    ', racing with the finesse of a ballet dancer.',
    ', proving that the only thing faster than their car is their ambition.',
    ", where winning is not a choice; it's a destiny.",
    ", racing like they've got a jet engine under the hood.",
    ", the racetrack's relentless competitor.",
    ', making the impossible look easy.',
    ', turning corners into canvases.',
    ', racing with the precision of a surgeon.',
    ", the track's ultimate trailblazer.",
    ', where speed is their middle name.',
    ', leaving competitors in their rearview mirror.',
    ", racing like they've got a fire-breathing dragon in the engine.",
    ', making every lap count.',
    ", the track's one and only.",
    ', turning racetracks into their personal playground.',
    ', racing with the heart of a lion.',
    ', where every lap is a masterpiece.',
    ', proving that victory is the only option.',
    ", the racetrack's unstoppable force.",
    ", driving like there's no tomorrow.",
    ', turning asphalt into art.',
    ', racing with the grace of a ballerina.',
    ', where speed meets strategy.',
    ", the racetrack's reigning champion.",
    ', making every lap a work of art.',
    ", the track's fearless leader.",
    ", racing like they've got a rocket on wheels.",
    ', leaving competitors in the dust like a tornado.',
    ", the racetrack's undisputed ruler.",
    ', racing with the finesse of a maestro.',
    ', proving that speed is their ally.',
    ', where every lap is a step towards greatness.',
    ', turning every race into an epic saga.',
    ", the track's ultimate showman.",
    ', where victory is the only option.',
    ", racing like they've got a thunderstorm in the engine.",
    ', making every turn a moment of perfection.',
    ", the track's one and only.",
    ', turning racetracks into their personal theater.',
    ', racing with the heart of a champion.',
    ', where every lap is a symphony of speed.',
    ', proving that excellence is their standard.',
    ", the racetrack's relentless warrior.",
    ", racing like there's no finish line.",
    ', turning every lap into a work of art.',
    ", the track's fearless icon.",
    ', where speed is their greatest weapon.',
    ', leaving competitors in the dust like a hurricane.',
    ", the racetrack's undefeated legend.",
];
