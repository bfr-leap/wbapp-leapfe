#/bin/bash

function single_arg_mode() {
    replay_root_dir=/z/arturo/iracing/replays

    state=$(cat $replay_root_dir/state.txt)
    if [ "$state" = "" ]; then
        state='sink'
        echo $state > $replay_root_dir/state.txt
    fi

    new_state=$1

    if [ "$new_state" = "$state" ]; then
        exit 0
    fi

    rm -rfv  $replay_root_dir-$state/*
    mv $replay_root_dir/* $replay_root_dir-$state/
    mv $replay_root_dir-$new_state/* $replay_root_dir/

    echo $new_state > $replay_root_dir/state.txt
}

function single_file_mode() {
    replay_root_dir=/z/arturo/iracing/replays

    state=$(cat $replay_root_dir/state.txt)
    if [ "$state" = "" ]; then
        state='sink'
        echo $state > $replay_root_dir/state.txt
    fi

    new_state=$1

    if [ "$new_state" = "$state" ]; then
        exit 0
    fi

    rm -rfv  $replay_root_dir-$state/*
    mv $replay_root_dir/* $replay_root_dir-$state/
    cp $replay_root_dir-$new_state/$2.rpy $replay_root_dir/

    echo "sink" > $replay_root_dir/state.txt
}

usage_info="$> mount-replay.sh empty|leap|old|player  [file]"

if [ $# -lt 1 ]; then
    echo "usage"
    echo $usage_info
    exit 1
fi

if [ $# -eq 1 ]; then
    single_arg_mode $1
    exit 0
fi

if [ $# -eq 2 ]; then
    single_file_mode $1 $2
    exit 0
fi



# echo $state
# echo $new_state