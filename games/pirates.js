var tiles = {
    BEACH_0x0: {
        distance_description: "It looks like beach.",
        description: "You see the ocean for miles, you feel the sand in your shoes (which have a lot of holes, you're poor). On the beach is some dried driftwood, some rocks, and what appears to be a dead parrot.",
        items: ["sand", "driftwood", "rocks", "dead parrot"]
    },
    BEACH_1x0: {
        distance_description: "It looks like more beach.",
        description: "You see the ocean for miles, nothing much here."
    }
}

module.exports = {
    map: {
        "0x0": tiles.BEACH_0x0,
        "1x0": tiles.BEACH_1x0
    },
    items: {
        sand: {
            take: function (playerState) {
                return {can: true, msg: "The sand feels hot and smooth as it seeps through your fingers. You manage to get a handful and put it in your pocket"};
            },
            use: {
                player: function (playerState, otherPlayer) {
                    // Blind player for 1 turn
                },
                default: function (playerState) {
                    // Hear a "hisss" and lose sand
                }
            }
        },
        rocks: {},
        driftwood: {},
        rocks: {},
        "dead parrot": {}   
    }
}