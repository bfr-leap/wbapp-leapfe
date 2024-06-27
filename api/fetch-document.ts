async function fetchObjects(urls: string[]): Promise<any[]> {
    try {
        let objs = await Promise.all(
            (
                await Promise.all(urls.map((url) => fetch(url)))
            ).map((response) => response.json())
        );

        return objs;
    } catch (e) {
        return urls.map((v) => null);
    }
}

function ldArg(arg: string | number | undefined): string {
    return (arg) ? '/' + arg : '';
}

function nNums(n: any): string {
    return n.toString().replace('-', 'n');
}

export default async function handler(req: any, res: any) {
    const q: {
        [name: string]: string | number
    } = req?.query || {};

    const url = `https://arturo-mayorga.github.io/irl_stats/dist/data/${q.namespace + '/'
        }${q.type
        }${ldArg(q.league)
        }${ldArg(q.season)
        }${ldArg(q.subsession)
        }${nNums(ldArg(q.simsession))
        }${ldArg(q.driver)
        }${ldArg(q.car)
        }${ldArg(q.track)
        }${ldArg(q.sessionType)
        }${ldArg(q.custId)
        }.json`;

    console.log(`fetch: ${url}`);


    const hc = await fetchObjects([url]);

    res.status(200).json({ doc: hc[0] });
}