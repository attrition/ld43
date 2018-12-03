// set up

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const info = document.getElementById("info");
const selectedInfo = document.getElementById("selected");
const actions = document.getElementById("actions");
const newGameBtn = document.getElementById("newGameButton");
const passBtn = document.getElementById("passButton");
const drainBtn = document.getElementById("drainButton");

const log = document.getElementById("log");

const tile = Object.freeze({
    size: 48,
    scale: 2
});

const drainMoraleReq = 3;

ctx.msImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.imageSmoothingEnabled = false;
ctx.scale(tile.scale, tile.scale);

// info panel handling

function updateSelectedInfo(ent) {
    selectedInfo.innerHTML = ent.infoCard();
}

var logArr = [];
var addLog = function(msg) {
    if (logArr.length >= 4) {
        logArr.shift();
    }
    logArr.push(msg);

    log.innerHTML = "";
    for (let logMsg of logArr) {
        log.innerHTML += logMsg + "<br/>";
    }
};

var clearLog = function() {
    log.innerHTML = "";
    logArr = [];
};

function styleInfoPanel(side) {
    switch(side) {
        case -1:
            info.style.backgroundColor =
                    selectedInfo.style.backgroundColor =
                    actions.style.backgroundColor =
                    log.style.backgroundColor = "rgb(15, 15, 15)";
            info.style.borderColor =
                    selectedInfo.style.borderColor =
                    actions.style.borderColor =
                    log.style.borderColor = "#333";
            break;
        case 0:
            info.style.backgroundColor =
                    selectedInfo.style.backgroundColor =
                    actions.style.backgroundColor =
                    log.style.backgroundColor = "rgb(5, 5, 30)";
            info.style.borderColor =
                    selectedInfo.style.borderColor =
                    actions.style.borderColor =
                    log.style.borderColor = "#00F";
            break;
            
        case 1:
            info.style.backgroundColor =
                    selectedInfo.style.backgroundColor =
                    actions.style.backgroundColor =
                    log.style.backgroundColor = "rgb(30, 5, 5)";
            info.style.borderColor =
                    selectedInfo.style.borderColor =
                    actions.style.borderColor =
                    log.style.borderColor = "#F00";
            break;
    }
}

// deselected no-team style by default
styleInfoPanel(-1);

function tileIndexFromXY(x, y) {
    return (y * mapSize.width + x);
}

function realPosFromTilePos(x, y) {
    return {
        x: x * tile.size,
        y: y * tile.size
    };
}

function realPosFromTilePosPlusOffsets(x, y, offsets) {
    return {
        x: (x * tile.size) + offsets.x,
        y: (y * tile.size) + offsets.y
    };
}

function tilePosFromRealPos(x, y) {
    return {
        x: x / tile.size,
        y: y / tile.size
    };
}

// game data

const mapSize = Object.freeze({
    width: 9,
    height: 8
});

const GAMESTATES = Object.freeze({
    NEEDUNIT: "NeedUnitSelection",
    SELECTACTION: "SelectUnitAction",
    AITURN: "AIThinking",
    ANIMATING: "Animating",
    GAMEOVER: "GameOver",
    SELECTDRAIN: "SelectFriendlyDrainTarget",
});

const ENTITY_TYPES = Object.freeze({
    SOLDIER: "soldier",
    ARCHER: "archer",
    CAVALRY: "cavalry",
    KING: "king"
});

const entityLayouts = Object.freeze({
    [ENTITY_TYPES.SOLDIER]: [ // 8
        { x: 6, y: 5 },
        { x: 22, y: 5 },
        { x: 38, y: 5 },
        { x: 14, y: 18 },
        { x: 30, y: 18 },
        { x: 6, y: 30 },
        { x: 22, y: 30 },
        { x: 38, y: 30 },
    ],
    [ENTITY_TYPES.ARCHER]: [ // 6
        { x: 10, y: 10 },
        { x: 22, y: 10 },
        { x: 34, y: 10 },
        { x: 10, y: 25 },
        { x: 22, y: 25 },
        { x: 34, y: 25 },
    ],
    [ENTITY_TYPES.CAVALRY]: [ // 4
        { x: 0, y: -1 },
        { x: 0, y: 22 },
        { x: 23, y: -1 },
        { x: 23, y: 22 }
    ],
    [ENTITY_TYPES.KING]: [ // 1
        { x: 10, y: 1 }
    ]
});

const entityAttackPatterns = Object.freeze({
    [ENTITY_TYPES.SOLDIER]: [ // range 1
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
    ],
    [ENTITY_TYPES.ARCHER]: [ // range 2
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },

        { x: -1, y: -1 },
        { x: -1, y: 1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        
        { x: 0, y: -2 },
        { x: 0, y: 2 },
        { x: -2, y: 0 },
        { x: 2, y: 0 },
    ],
    [ENTITY_TYPES.CAVALRY]: [ // range 1
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
    ],
    [ENTITY_TYPES.KING]: [ // range 1
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
    ]

});

const ANIM_STATES = Object.freeze({
    IDENTIDY: 0,
    IDLE: 1,
    ATTACK1: 2,
    ATTACK2: 3,
    ATTACK3: 4
});

// side 1 needs different figure offsets as their images are flipped
const sideOffsets = [
    {
        [ENTITY_TYPES.SOLDIER]: 0,
        [ENTITY_TYPES.ARCHER]: 0,
        [ENTITY_TYPES.CAVALRY]: 0,
        [ENTITY_TYPES.KING]: 0
    },
    {
        [ENTITY_TYPES.SOLDIER]: -11,
        [ENTITY_TYPES.ARCHER]: -11,
        [ENTITY_TYPES.CAVALRY]: 0,
        [ENTITY_TYPES.KING]: -20,
    }
]

const FIGURE_IMAGE_FILES = Object.freeze({
    [ENTITY_TYPES.SOLDIER]: [
        "soldier%.png",
        "soldier%-idle.png",
        "soldier%-attack1.png",
        "soldier%-attack2.png",
        "soldier%-attack3.png",
    ],
    [ENTITY_TYPES.ARCHER]: [
        "archer%.png",
        "archer%-idle.png",
        "archer%-attack1.png",
        "archer%-attack2.png",
        "archer%-attack3.png",
    ],
    [ENTITY_TYPES.CAVALRY]: [
        "cavalry%.png",
        "cavalry%-idle.png",
        "cavalry%-attack1.png",
        "cavalry%-attack2.png",
        "cavalry%-attack3.png",
    ],
    [ENTITY_TYPES.KING]: [
        "king%.png",
        "king%-idle.png",
        "king%-attack1.png",
        "king%-attack2.png",
        "king%-attack3.png",
    ],
});

let MARKER_TYPE = Object.freeze({
    SMALL: "small",
    LARGE: "large",
    KING: "king",
});

const ENTITY_MARKER_STYLES = Object.freeze({
    [ENTITY_TYPES.SOLDIER]: MARKER_TYPE.SMALL,
    [ENTITY_TYPES.ARCHER]: MARKER_TYPE.SMALL,
    [ENTITY_TYPES.CAVALRY]: MARKER_TYPE.LARGE,
    [ENTITY_TYPES.KING]: MARKER_TYPE.KING,
});

// sprite handling

let markerSpriteCache = []; // one set per side
for (let side = 0; side < 2; ++side) {
    markerSpriteCache[side] = {}
    markerSpriteCache[side][MARKER_TYPE.SMALL] = new Image();
    markerSpriteCache[side][MARKER_TYPE.LARGE] = new Image();
    markerSpriteCache[side][MARKER_TYPE.SMALL].src = "unit-marker" + side + ".png";
    markerSpriteCache[side][MARKER_TYPE.LARGE].src = "cavalry-marker" + side + ".png";
    markerSpriteCache[side][MARKER_TYPE.KING] = markerSpriteCache[side][MARKER_TYPE.LARGE];
}

let markerLayouts = [
    {
        [MARKER_TYPE.SMALL]: { x: -1, y: 10},
        [MARKER_TYPE.LARGE]: { x: 0, y: 23},
        [MARKER_TYPE.KING]: { x: 1, y: 43},
    },
    {
        [MARKER_TYPE.SMALL]: { x: -1, y: 10},
        [MARKER_TYPE.LARGE]: { x: 7, y: 23},
        [MARKER_TYPE.KING]: { x: 8, y: 43},
    },
];

// one image for each state, per side
let spriteCache = [
    {
        [ENTITY_TYPES.SOLDIER]: [ new Image(), new Image(), new Image(), new Image(), new Image() ],
        [ENTITY_TYPES.ARCHER]:  [ new Image(), new Image(), new Image(), new Image(), new Image() ],
        [ENTITY_TYPES.CAVALRY]: [ new Image(), new Image(), new Image(), new Image(), new Image() ],
        [ENTITY_TYPES.KING]:    [ new Image(), new Image(), new Image(), new Image(), new Image() ],
    },
    {
        [ENTITY_TYPES.SOLDIER]: [ new Image(), new Image(), new Image(), new Image(), new Image() ],
        [ENTITY_TYPES.ARCHER]:  [ new Image(), new Image(), new Image(), new Image(), new Image() ],
        [ENTITY_TYPES.CAVALRY]: [ new Image(), new Image(), new Image(), new Image(), new Image() ],
        [ENTITY_TYPES.KING]:    [ new Image(), new Image(), new Image(), new Image(), new Image() ],
    }
];

function imageFromTypeSideState(type, side, state) {
    let filename = FIGURE_IMAGE_FILES[type][state];
    return filename.replace("%", side);
}

function LoadSpriteCacheForEntity(type) {
    for (let side = 0; side < 2; ++side) {
        for (let i = 0; i < 5; ++i) {
            let filename = imageFromTypeSideState(type, side, i);
            spriteCache[side][type][i].src = filename;
        }    
    }
}

function distBetweenTiles(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

let gameState = GAMESTATES.NEEDUNIT;
let gameOver = false;
let entities = [];
let highlights = [];
let frameHighlights = [];
let currentSide = -1;
let blockedTile = [];
let selectedUnit = null;

function newGame() {
    gameState = GAMESTATES.NEEDUNIT;
    gameOver = false;
    entities = [];
    highlights = [];
    frameHighlights = [];
    currentSide = -1;
    blockedTile = [];
    selectedUnit = null;

    clearLog();
    setupMap();
    nextTurn();
}

LoadSpriteCacheForEntity(ENTITY_TYPES.SOLDIER);
LoadSpriteCacheForEntity(ENTITY_TYPES.ARCHER);
LoadSpriteCacheForEntity(ENTITY_TYPES.CAVALRY);
LoadSpriteCacheForEntity(ENTITY_TYPES.KING);

function getStatsForEntity(type) {
    let stats = {
        morale: 0,
        moves: 0,
        range: 0,
    };

    switch (type) {
        case ENTITY_TYPES.SOLDIER:
            stats.strength = 2;
            stats.morale = 3;
            stats.moves = 1;
            stats.range = 1;
            break;
        case ENTITY_TYPES.ARCHER:
            stats.strength = 2;
            stats.morale = 2;
            stats.moves = 1;
            stats.range = 2;
            break;
        case ENTITY_TYPES.CAVALRY:
            stats.strength = 8;
            stats.morale = 5;
            stats.moves = 2;
            stats.range = 1;
            break;        
        case ENTITY_TYPES.KING:
            stats.strength = 20;
            stats.morale = 50;
            stats.moves = 2;
            stats.range = 1;
            break;
    }

    return stats;
}

function getStatsForFigure(type) {
    let stats = {
        health: 0,
    };

    switch (type) {
        case ENTITY_TYPES.SOLDIER:
            stats.health = 4;
            break;

        case ENTITY_TYPES.ARCHER:
            stats.health = 3;
            break;

        case ENTITY_TYPES.CAVALRY:
            stats.health = 6;
            break;

        case ENTITY_TYPES.KING:
            stats.health = 40;
            break;
    }

    return stats;
}

function checkWinState() {
    let ents = [
        0, 0
    ];
    let kings = [
        0, 0
    ];
    for (ent of entities) {
        ents[ent.side]++;
        if (ent.type == ENTITY_TYPES.KING) {
            kings[ent.side]++;
        }
    }

    let winner = -1;
    if (ents[0] == 0 || kings[0] == 0) {
        winner = 1;
    } else if (ents[1] == 0 || kings[1] == 0) {
        winner = 0;
    }

    if (winner != -1) {
        gameState = GAMESTATES.GAMEOVER;
        gameOver = true;
        addLog("GAME OVER! " + sideName(winner) + " wins!");
        showActionButtons({ newGame: true });
    }
}

function getFigureToHit(defender) {
    let randomIdx = -1;
    let figures = defender.figures;
    let total = figures.length;
    let anyAlive = false;

    // check if any figures are actually alive
    for (let i = 0; i < total; ++i) {
        if (figures[i].stats.health > 0) {
            anyAlive = true;
            break;
        }
    }

    if (!anyAlive) {
        return {
            figure: null,
            index: -1,
        };
    }
    
    while (true) {
        // search for a random target with health, if not found repeat search
        randomIdx = Math.floor(Math.random() * Math.floor(total));
        if (figures[randomIdx].stats.health > 0) {
            break;
        }
    }

    return {
        figure: figures[randomIdx],
        index: randomIdx
    };
}

class Figure {
    constructor(type, x, y, index, side) {
        this.type = type;
        this.index = index;
        this.side = side;
        
        this.initialStats = getStatsForFigure(this.type);
        this.stats = getStatsForFigure(this.type);

        let offset = {
            x: entityLayouts[type][index].x + sideOffsets[this.side][this.type],
            y: entityLayouts[type][index].y
        }

        this.offsetPos = offset;
        this.absolutePos = realPosFromTilePosPlusOffsets(x, y, this.offsetPos);
        
        this.markerStyle = ENTITY_MARKER_STYLES[type];

        this.animState = ANIM_STATES.IDLE;
        this.sprite = spriteCache[this.side][this.type][ANIM_STATES.IDENTIDY]
    }

    render(time, actionsLeft) {
        if (actionsLeft) {
            // compensate for the absolute position of side 1 images being far to the left of where the unit stands
            let markerOffset = {
                x: markerLayouts[this.side][this.markerStyle].x - sideOffsets[this.side][this.type],
                y: markerLayouts[this.side][this.markerStyle].y
            };
            ctx.drawImage(markerSpriteCache[this.side][this.markerStyle],
                this.absolutePos.x + markerOffset.x, this.absolutePos.y + markerOffset.y);
        }

        if (this.animState == ANIM_STATES.IDENTIDY || this.animState == ANIM_STATES.IDLE) {
            if (time % 1000 < 500) {
                this.animState = ANIM_STATES.IDENTIDY;
            } else {
                this.animState = ANIM_STATES.IDLE;
            }
        }

        this.animState = Math.floor(this.animState);
        ctx.drawImage(spriteCache[this.side][this.type][this.animState],
            this.absolutePos.x, this.absolutePos.y);
    }
}

function clearDeadFigures(ent) {
    for (let i = ent.figures.length - 1; i >= 0; --i) {
        if (ent.figures[i].stats.health <= 0) {
            ent.figures.splice(i, 1);
        }
    }
}

function clearDeadEntities() {
    for (let i = entities.length - 1; i >= 0; --i) {
        let ent = entities[i];
        if (ent.figures.length == 0) {
            addLog(sideName(ent.side) + " " + ent.type + " was destroyed!");
            console.log("entities", entities);
            console.log("clearing ent:", ent," at idx:", i);
            entities.splice(i, 1);
        }    
    }
}

function clearSkirmishers(attacker, defender) {
    clearDeadFigures(attacker);
    clearDeadFigures(defender);
    clearDeadEntities();

    if (gameOver) {
        return;
    }

    checkWinState();
}

function tweenEntToTile(ent, target) {

    for (let fig of ent.figures) {
        let newReal = realPosFromTilePosPlusOffsets(target.x, target.y, fig.offsetPos);
        (new TWEEN.Tween(fig.absolutePos)
            .to({ x: newReal.x, y: newReal.y }, 200)
            ).start();
    }
}

function tweenAttackAnimation(attacker, defender) {
    let fn = function(fig) {
        (new TWEEN.Tween(fig)
            .to({ animState: ANIM_STATES.ATTACK1 }, 500)
            .to({ animState: ANIM_STATES.ATTACK2 }, 100)
            .to({ animState: ANIM_STATES.ATTACK3 }, 500)
            .onComplete(function() {
                fig.animState = ANIM_STATES.IDENTIDY;
                clearDeadEntities();
            })
        ).start();
    }
    
    for (let fig of attacker.figures) {
        fn(fig);
    }
    
    for (let fig of defender.figures) {
        fn(fig);
    }
}

class Entity {
    constructor(type, x, y, side) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.side = side;
        this.figures = [];
        this.actionsLeft = true;
        this.drainLeft = (this.type == ENTITY_TYPES.KING);

        this.initialStats = getStatsForEntity(this.type);
        this.initialFigureStats = getStatsForFigure(this.type);
        this.stats = getStatsForEntity(this.type);

        this.moveTiles = [];
        this.targets = [];

        for (let i = 0; i < entityLayouts[type].length; ++i) {
            this.figures[i] = new Figure(type, x, y, i, side);
        }
    }
    
    checkRout() {
        if (entities.indexOf(this) != -1 && this.stats.morale <= 0) {
            addLog(sideName(this.side) + " " + this.type + " routed from low morale!");
            entities.splice(entities.indexOf(this), 1);
        }
    }

    drain(ent) {

        let drainedHealth = 0;
        for (let fig of ent. figures) {
            drainedHealth += fig.stats.health;
        }
        // king has 1 figure (or is dead)
        this.figures[0].stats.health += (drainedHealth);

        entities.splice(entities.indexOf(ent), 1);
        ent = null;

        this.drainLeft = false;
    }

    attack(ent) {

        // any damage over the requirement to kill a figure will be added to
        // another random figure so overkill damage isn't wasted

        let applyDmgToAnyFig = function(ent, dmg) {
            let targetDetails = getFigureToHit(ent);

            // -1 index means no alive figures to target
            if (targetDetails.index == -1) {
                return;
            }
            let targetFig = targetDetails.figure;
            targetFig.stats.health -= dmg;

            // apply overkill damage
            if (targetFig.stats.health < 0) {
                let overkillDmg = targetFig.stats.health * -1;
                applyDmgToAnyFig(ent, overkillDmg);
            }
        };

        // damage is done by attackers then defenders, alternating figure by figure
        // attackers have a slight advantage this way, breaking ties

        let attFigs = this.figures;
        let defFigs = ent.figures;
        let maxRounds = Math.max(attFigs.length, defFigs.length);
        let figIdx = 0;

        // morale is applied after this combat round:
        //   attacking greater strength force: -2 morale
        //   attacking lesser strength force: +2 morale
        //   defending from greater strength: -1 morale
        //   defending from lesser strength: +1 morale
        //   same force: 0 morale either side       // archers are a bit different, gaining +1 morale in attack
        //   and causing 1 morale loss to defender regardless of str
        let moraleAtt = this.stats.morale;
        let moraleDef = ent.stats.morale;

        let totalAttStr = this.stats.strength * this.figures.length;
        let totalDefStr = ent.stats.strength * ent.figures.length;

        if (totalAttStr > totalDefStr) {
            moraleAtt += 2;
            moraleDef -= 1;
        } else if (totalDefStr > totalAttStr) {
            // archers attack at range so only cause morale drops
            // they do take morale loss when attacked
            if (this.type == ENTITY_TYPES.ARCHER) {
                moraleAtt += 1;
                moraleDef -= 1;
            } else {
                moraleAtt -= 2;
                moraleDef += 1;
            }
        }

        let damageDone = 0;
        let damageTaken = 0;

        while (figIdx < maxRounds)
        {
            if (figIdx < attFigs.length && entities.indexOf(ent) != -1) {
                damageDone += this.stats.strength;
                applyDmgToAnyFig(ent, this.stats.strength);
                clearSkirmishers(this, ent);
            }

            // archers don't take return damage as it's a ranged attack
            if (this.type != ENTITY_TYPES.ARCHER && figIdx < defFigs.length &&
                entities.indexOf(this) != -1) {
                damageTaken += ent.stats.strength;
                applyDmgToAnyFig(this, ent.stats.strength);
                clearSkirmishers(this, ent);
            }

            figIdx++;
        }

        tweenAttackAnimation(this, ent);
        clearDeadEntities();

        // if this was an even match change morale based on who is stronger post fight
        // only +/- 1 morale for this
        if (moraleAtt == moraleDef) {
            totalAttStr = this.stats.strength * this.figures.length;
            totalDefStr = ent.stats.strength * ent.figures.length;

            if (totalAttStr > totalDefStr) {
                moraleAtt += 1;
                moraleDef -= 1;
            } else if (totalDefStr > totalAttStr) {
                moraleAtt -= 1;
                moraleDef += 1;
            }

        }

        addLog(sideName(this.side) + " " + this.type + " attacks " +
        sideName(ent.side) + " " + ent.type + " " +
        "for " + damageDone + " (" + damageTaken + " damage taken)");
        
        this.stats.morale = moraleAtt;
        ent.stats.morale = moraleDef;
        
        this.checkRout();
        ent.checkRout();
        
        this.targets = [];
        this.moveTiles = [];
        this.actionsLeft = false;
        resetBlockedTiles();
    }

    hasTarget(ent) {
        return (selectedUnit.targets.indexOf(ent) != -1)        
    }

    setAttackTargets() {
        this.targets = [];

        let pat = entityAttackPatterns[this.type];
        for (let targetOffset of pat) {
            let targetTile = { x: this.x + targetOffset.x, y: this.y + targetOffset.y };
            for (let ent of entities) {
                if (ent.x == targetTile.x && ent.y == targetTile.y && ent.side != currentSide) {
                    this.targets.push(ent);
                }
            }
        }
    }

    setDrainTargets() {
        this.targets = [];

        for (let ent of entities) {
            if (ent.side == currentSide && ent != this && ent.stats.morale >= drainMoraleReq) {
                this.targets.push(ent);
            }
        }
    }

    setAIFavouredMove() {
        // this is like createMoveMatrix except we will remove any move
        // that isn't the closest move towards an enemy unit

        this.createMoveMatrix();
        let closestMove = {};
        let closestDist = 999999;

        for (let move of this.moveTiles) {
            for (let ent of entities) {
                if (ent.side != this.side) {
                    let dist = distBetweenTiles(move, ent);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestMove = move;
                    }
                }
            }
        }

        this.moveTiles = [];
        this.moveTiles.push(closestMove);
    }

    takeAIFavouredMove() {
        if (this.moveTiles.length == 1) {
            this.moveTo(this.moveTiles[0]);
        }
    }

    createMoveMatrix() {
        this.moveTiles = [];
        let added = {};

        let checkDir = function(self, x, y, movesLeft) {
            let tileIdx = tileIndexFromXY(x, y);
            if (movesLeft < 0 || 
                x >= mapSize.width || x < 0 ||
                y >= mapSize.height || y < 0 ||
                added[tileIdx] == true ||
                isBlockedTile(x, y)) {
                return;
            }
            
            // unblocked and have movement, add tile
            added[tileIdx] = true;
            self.moveTiles.push({x: x, y: y, cost: self.stats.moves - movesLeft});

            // check neighbours
            checkDir(self, x - 1, y, movesLeft - 1);
            checkDir(self, x + 1, y, movesLeft - 1);
            checkDir(self, x, y - 1, movesLeft - 1);
            checkDir(self, x, y + 1, movesLeft - 1);
        };

        checkDir(this, this.x - 1, this.y, this.stats.moves - 1);
        checkDir(this, this.x + 1, this.y, this.stats.moves - 1);
        checkDir(this, this.x, this.y - 1, this.stats.moves - 1);
        checkDir(this, this.x, this.y + 1, this.stats.moves - 1);
    }

    newTurn() {
        this.actionsLeft = true;
        this.drainLeft = (this.type == ENTITY_TYPES.KING);
        this.stats.moves = this.initialStats.moves;
    }

    moveTo(moveLoc) {
        this.stats.moves -= moveLoc.cost;
        this.x = moveLoc.x;
        this.y = moveLoc.y;

        for (let fig of this.figures) {
            tweenEntToTile(this, moveLoc);
        }

        this.setAttackTargets();
        updateSelectedInfo(this);
        if (this.stats.moves == 0 && this.targets.length == 0) {
            this.actionsLeft = false;
        }


        resetBlockedTiles();
    }

    infoCard() {
        let combinedHP = 0;
        let maxHP = entityLayouts[this.type].length * this.initialFigureStats.health;
        for (let fig of this.figures) {
            combinedHP += fig.stats.health;
        }

        return this.type + "<br />" + "health: " + combinedHP + "/" + maxHP + ", " +
            "strength: " + this.stats.strength + "<br />" +
            "movement: " + this.stats.moves + "/" + this.initialStats.moves + ", " +
            "range: " + this.stats.range + " <br />" +
            "morale: " + this.stats.morale;
    }

    render(time) {
        for (let fig of this.figures) {
            fig.render(time, this.actionsLeft);
        }
    }
}

function addEntity(type, x, y, side) {
    entities.push(new Entity(type, x, y, side));
}

const HIGHLIGHT = Object.freeze({
    SELECT: { image: new Image(), alpha: 1 },
    MOVE: { image: new Image(), alpha: 0.4 },
    ATTACK: { image: new Image(), alpha: 1 }
});
HIGHLIGHT.SELECT.image.src = "highlight-sel-move.png";
HIGHLIGHT.MOVE.image.src = "highlight-move.png";
HIGHLIGHT.ATTACK.image.src = "highlight-target.png";

function showActionButtons(which) {
    passBtn.style.display = "none";
    drainBtn.style.display = "none";
    newGameBtn.style.display = "none";

    if (gameOver) {
        newGameBtn.style.display = "block";
    }
    
    if (which.pass == true) {
        passBtn.style.display = "block";
    }
    if (which.drain == true) {
        drainBtn.style.display = "block";
    }
    if (which.newGame == true) {
        newGameBtn.style.display = "block";
    }
}

// logic

function resetBlockedTiles() {
    blockedTile = [];
    for (let ent of entities) {
        blockedTile[ent.y * mapSize.width + ent.x] = true;
    }
}
function isBlockedTile(x, y) {
    return (blockedTile[y * mapSize.width + x] == true);
}

function aiMakeAttacks() {
    for (ent of entities) {
        if (ent.side == currentSide && ent.actionsLeft) {
            ent.setAttackTargets();
            if (ent.targets.length > 0) {
                //TODO: select the best attack
                let target = ent.targets[0];
                ent.attack(target);

                if (gameState == GAMESTATES.GAMEOVER) {
                    return;
                }            
            }
        }
    }    
}

function aiTurn() {
    gameState = GAMESTATES.AITURN;

    aiMakeAttacks();

    if (gameState == GAMESTATES.GAMEOVER) {
        return;
    }

    // find moves
    for (ent of entities) {
        if (ent.side == currentSide) {
            ent.setAIFavouredMove();
            ent.takeAIFavouredMove();
        }
    }

    // move closest then furthest

    aiMakeAttacks();

    if (gameState == GAMESTATES.GAMEOVER) {
        return;
    }

    // done
    nextTurn();
}

function moreActions() {
    let movesLeft = false;

    for (let ent of entities) {
        if (ent.side == currentSide && ent.actionsLeft) {
            movesLeft = true;
            break;
        }
    }

    return movesLeft;
}

function sideName(side) {
    if (side == 0) {
        return "Player";
    }

    return "Enemy";
}

function nextTurn() {

    playerDeselectUnit();

    if (gameState == GAMESTATES.GAMEOVER) {
        return;
    }

    currentSide++;
    if (currentSide >= 2) {
        currentSide = 0;
    }

    if (currentSide == 0) {
        showActionButtons({ pass: true });
    } else {
        showActionButtons({});
    }

    addLog(sideName(currentSide) + " turn");

    resetBlockedTiles();

    for (let ent of entities) {
        ent.newTurn();
    }

    if (currentSide == 0) {
        gameState = GAMESTATES.NEEDUNIT;
    } else {
        if (gameState != GAMESTATES.GAMEOVER) {
            aiTurn();
        }
    }
}

function playerSelectUnit(ent) {
    resetBlockedTiles();
    gameState = GAMESTATES.SELECTACTION;

    showActionButtons({ pass: true, drain: (ent.actionsLeft && ent.drainLeft) });

    selectedUnit = ent;
    selectedUnit.setAttackTargets();
    selectedUnit.createMoveMatrix();

    highlights = [];
    for (let move of ent.moveTiles) {
        highlights.push({x: move.x, y: move.y, type: HIGHLIGHT.MOVE});
    }
    setTargetHighlights();
}

function playerDeselectUnit() {
    selectedUnit = null;
    gameState = GAMESTATES.NEEDUNIT;
    highlights = [];
    showActionButtons({ pass: true });
}

function setTargetHighlights() {
    for (let target of selectedUnit.targets) {
        highlights.push({x: target.x, y: target.y, type: HIGHLIGHT.ATTACK});
    }    
}

function moveSelectedUnitTo(moveLoc) {
    selectedUnit.moveTo(moveLoc);
    if (selectedUnit.actionsLeft) {
        playerSelectUnit(selectedUnit);
    } else {
        highlights = [];
        if (!moreActions()) {
            nextTurn();
        } else {
            gameState = GAMESTATES.NEEDUNIT;
        }
    }
}

// input

function selectDrain() {
    if (gameState != GAMESTATES.SELECTACTION && selectedUnit.type != ENTITY_TYPES.KING) {
        return;
    }

    gameState = GAMESTATES.DRAINTARGET;

    highlights = [];
    selectedUnit.targets = [];
    selectedUnit.setDrainTargets();
    setTargetHighlights();

    addLog("Select a friendly unit to drain for extra health (unit must have " +
            drainMoraleReq + " or more morale)");
    addLog("* This will destroy the friendly unit, but some sacrifice is necessary to survive");
}

let mousePos = {};

function getMousePos(event) {
    var rect = canvas.getBoundingClientRect();

    return {
        x: Math.floor((event.clientX - rect.left) / tile.scale / tile.size),
        y: Math.floor((event.clientY - rect.top) / tile.scale / tile.size)
    };
}

canvas.addEventListener("mouseup", function(event) {
    mousePos = getMousePos(event);
    if (gameState == GAMESTATES.NEEDUNIT) {
        for (let ent of entities) {
            if (ent.side == currentSide &&
                ent.actionsLeft &&
                ent.x == mousePos.x &&
                ent.y == mousePos.y) {
                playerSelectUnit(ent);
                break;
            }
        }
    }
    else if (gameState == GAMESTATES.DRAINTARGET) {
        let clickedUnit = false;
        for (let ent of entities) {
            if (ent.x == mousePos.x && ent.y == mousePos.y) {
                if (selectedUnit.targets.indexOf(ent) != -1) {
                    clickedUnit = true;
                    addLog("draining");
                    selectedUnit.drain(ent);
                    playerSelectUnit(selectedUnit);   
                }
            }
        }
        if (!clickedUnit) {
            // otherwise deselect unit
            playerDeselectUnit();
        }
    }
    else if (gameState == GAMESTATES.SELECTACTION) {
        // check if clicked on a move square
        for (let moveLoc of selectedUnit.moveTiles) {
            if (moveLoc.x == mousePos.x && moveLoc.y == mousePos.y) {
                moveSelectedUnitTo(moveLoc);
                return;
            }
        }

        // check if clicked to attack enemy unit or
        // clicked to select friendly unit
        for (let ent of entities) {
            if (ent.x == mousePos.x && ent.y == mousePos.y) {
                if (ent.side == currentSide) {
                    playerSelectUnit(ent);
                    return;
                } else {
                    if (selectedUnit.hasTarget(ent)) {
                        selectedUnit.attack(ent);
                        playerDeselectUnit();
                        
                        if (gameState == GAMESTATES.GAMEOVER) {
                            return;
                        }

                        if (!moreActions()) {
                            nextTurn();                            
                        }

                        return;
                    }
                }
            }
        }

        // otherwise deselect unit
        playerDeselectUnit();
    }
}, false);

canvas.addEventListener("mousemove", function(event) {
    mousePos = getMousePos(event);
    frameHighlights = [];
    
    // allow highlight of friendly units and enemy when on player turn
    if (gameState == GAMESTATES.NEEDUNIT ||
        gameState == GAMESTATES.SELECTACTION ||
        gameState == GAMESTATES.DRAINTARGET) {

        for (let ent of entities) {
            if (ent.x == mousePos.x && ent.y == mousePos.y) {
                styleInfoPanel(ent.side);
                updateSelectedInfo(ent);
        
                let hlType = null;
                if (ent.side == currentSide) {
                    if (gameState != GAMESTATES.DRAINTARGET) {
                        if (ent.actionsLeft) {
                            hlType = HIGHLIGHT.SELECT;
                        }
                    } else {
                        hlType = HIGHLIGHT.SELECT;
                    }
                } else {
                    if (gameState == GAMESTATES.NEEDUNIT) {
                        hlType = HIGHLIGHT.ATTACK;
                    } else if (gameState == GAMESTATES.SELECTACTION) {
                        if (selectedUnit.targets.indexOf(ent) != -1) {
                            hlType = HIGHLIGHT.SELECT;
                        } else {
                            hlType = HIGHLIGHT.ATTACK;
                        }
                    }
                }

                if (hlType != null) {
                    frameHighlights.push({x: ent.x, y: ent.y, type: hlType});
                }
            
                return;
            }
        }
    }

    // if player is trying to move a unit also check if they're over a valid move
    if (gameState == GAMESTATES.SELECTACTION) {
        for (let move of selectedUnit.moveTiles) {
            if (move.x == mousePos.x && move.y == mousePos.y) {
                frameHighlights.push({x: mousePos.x, y: mousePos.y, type: HIGHLIGHT.SELECT});
            }
        }
    }

    styleInfoPanel(-1);
}, false);

// rendering

function drawHighlights(time) {
    for (let hl of frameHighlights) {
        ctx.globalAlpha = hl.type.alpha;
        ctx.drawImage(hl.type.image, hl.x * tile.size, hl.y * tile.size);
    }
    for (let hl of highlights) {
        ctx.globalAlpha = hl.type.alpha;
        ctx.drawImage(hl.type.image, hl.x * tile.size, hl.y * tile.size);
    }
    ctx.globalAlpha = 1;
}

function drawMap(time) {
    ctx.beginPath();
    ctx.rect(0, 0, mapSize.width * tile.size, mapSize.height * tile.size);
    ctx.fillStyle = "rgb(18, 73, 33)";
    ctx.fill();
    
    ctx.rect(0, 0, mapSize.Width * tile.size, mapSize.height * tile.size);
    let tileGridPat = ctx.createPattern(tileGrid, "repeat");
    ctx.fillStyle = tileGridPat;
    ctx.globalAlpha = 0.25;
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawEntities(time) {
    for (let ent of entities) {
        ent.render(time);
    }
}

let tileGrid = new Image();
tileGrid.src = "tile-grid.png";
let tileGridPat = ctx.createPattern(tileGrid, "repeat");

function drawFrame(time) {
    drawMap(time);    
    drawEntities(time);
    drawHighlights(time);
}

function setupMap() {

    addEntity(ENTITY_TYPES.SOLDIER, 2, (mapSize.height - 1) - 2, 0);
    addEntity(ENTITY_TYPES.SOLDIER, 3, (mapSize.height - 1) - 2, 0);
    addEntity(ENTITY_TYPES.SOLDIER, 4, (mapSize.height - 1) - 2, 0);
    addEntity(ENTITY_TYPES.SOLDIER, 5, (mapSize.height - 1) - 2, 0);
    addEntity(ENTITY_TYPES.SOLDIER, 6, (mapSize.height - 1) - 2, 0);
    addEntity(ENTITY_TYPES.ARCHER, 2, (mapSize.height - 1) - 1, 0);
    addEntity(ENTITY_TYPES.ARCHER, 3, (mapSize.height - 1) - 1, 0);
    addEntity(ENTITY_TYPES.ARCHER, 5, (mapSize.height - 1) - 1, 0);
    addEntity(ENTITY_TYPES.ARCHER, 6, (mapSize.height - 1) - 1, 0);
    addEntity(ENTITY_TYPES.CAVALRY, 1, (mapSize.height - 1) - 1, 0);
    addEntity(ENTITY_TYPES.CAVALRY, 7, (mapSize.height - 1) - 1, 0);
    addEntity(ENTITY_TYPES.KING, 4, (mapSize.height - 1) - 1, 0);

    addEntity(ENTITY_TYPES.SOLDIER, 1, 1, 1);
    addEntity(ENTITY_TYPES.SOLDIER, 7, 1, 1);
    addEntity(ENTITY_TYPES.SOLDIER, 2, 2, 1);
    addEntity(ENTITY_TYPES.SOLDIER, 3, 2, 1);
    addEntity(ENTITY_TYPES.SOLDIER, 4, 2, 1);
    addEntity(ENTITY_TYPES.SOLDIER, 5, 2, 1);
    addEntity(ENTITY_TYPES.SOLDIER, 6, 2, 1);
    addEntity(ENTITY_TYPES.SOLDIER, 2, 1, 1);
    addEntity(ENTITY_TYPES.SOLDIER, 6, 1, 1);
    addEntity(ENTITY_TYPES.ARCHER, 3, 1, 1);
    addEntity(ENTITY_TYPES.ARCHER, 4, 1, 1);
    addEntity(ENTITY_TYPES.ARCHER, 5, 1, 1);
    addEntity(ENTITY_TYPES.CAVALRY, 0, 2, 1);
    addEntity(ENTITY_TYPES.CAVALRY, 8, 2, 1);
    addEntity(ENTITY_TYPES.KING, 4, 0, 1);

}

function gameLoop(time) {
    TWEEN.update(time);
    drawFrame(time);
    requestAnimationFrame(gameLoop);
    TWEEN.update(time);
}

// set up and start

newGame();

requestAnimationFrame = window.requestAnimationFrame    ||
        window.webkitRequestAnimationFrame              ||
        window.msRequestAnimationFrame                  ||
        window.mozRequestAnimationFrame;

// run game

requestAnimationFrame(gameLoop);