<!-- Snapshot of FULLSCALE GAME — Test Rules, P1.0; source: https://docs.google.com/document/d/1jlDsXEQgh-dZcRKGmgITzTa0Ci4IPraLJoRrTjlrDvU/edit -->
<!-- Copied for offline, deterministic Codex development. Update explicitly if the Google Doc changes. -->

# FULLSCALE GAME — Test Rules

**UNOFFICIAL PLAYABLE PROTOTYPE • Version P1.0 • November 23, 2026**

Authority: This document is the complete, self-contained specification for the first playable prototype. Every rule below is an explicit TEST-ONLY design decision. It overrides earlier draft/open alternatives inside this copy, but does NOT alter the separate FULLSCALE GAME — Rules & Mechanics reference document. These rules are deliberately replaceable when the real cards are supplied.

Implementation target: two players, deterministic browser simulation, a 6 × 8 board, concealed programmed stacks, lane-ordered simultaneous resolution, and a small temporary card set. No network connection or graphical animation is required for rules correctness.

## 1. One-Minute Rules Summary

Each player is WEST or EAST. Both program their entire current hand into hidden top-to-bottom stacks, including L1, L2, L3 and END Signals. Cards are revealed in paired beats. Costed cards attempt to play immediately; an END stops that player's further reveals, leaving their lower cards hidden. When both players have revealed END, each player's revealed lane Signals dictate which lanes auto-move, one paired lane wave at a time. Military Assets (MAs) of Land, Sea and Air use different movement geometry. Pieces clash on simultaneous contact, surprise stationary enemies, or push friendly MAs. Reaching an opponent-facing Wall and auto-moving again scores a breach. First to two breaches after a completed turn wins; a 12-turn limit prevents endless games.

## 2. Authoritative Prototype Glossary

BOARD: fixed 6 columns × 8 rows, 48 cells. CELL: an integer coordinate (x,y) in x=1..6, y=1..8. LANE: a two-column-wide corridor; L1=x1–2, L2=x3–4, L3=x5–6, numbered NORTH to SOUTH. OWNER: the WEST or EAST player responsible for a card.

BORDER: a continuous dividing line between lanes (x=2|3 or x=4|5). BARRIER: a one-cell horizontal snake-making segment inside a lane. WALL: the terminal end of a lane at its West or East end (y=1 or y=8). BOUNDARY: outer North/South board limit (x=1 or x=6). BOARD PERIMETER: its Walls together with its Boundaries.

ORDER PHASE: both players prepare and commit a concealed full-hand stack, then reveal and resolve cards in paired beats. RESOLUTION PHASE: revealed lane Signals generate paired auto-movement waves after both ENDs. BEAT: one simultaneous top-card reveal from each player still active. WAVE: the nth revealed lane Signal of each player, executed together.

SIGNAL: persistent, free, reusable L1/L2/L3/END card. ACTION: a costed one-shot effect which normally goes to discard after being played. ASSET: a persistent board card. MILITARY ASSET (MA): a movable Asset with type LAND, SEA or AIR, COST, POWER and TURN WAIT (TW). RESOURCE (R): a one-turn budget for card costs. DISCARD: a player's temporarily unavailable cards. PERMANENT DISCARD: cards that never return (TW=−1).

FORWARD: toward the enemy Wall. BACK: toward one's own Wall. NORTH/SOUTH/EAST/WEST: fixed world compass directions; not screen directions. LEFT/RIGHT: relative to the owner's facing. UP_LANE/DOWN_LANE: +1/−1 index along that player's snake path. FRONTMOST: greatest own-lane path index (closest to enemy Wall in Land path terms).

MOVE: a one-cell Action or an automatically generated MA displacement. ATOMIC: evaluated as one submitted movement intent rather than as multiple player turns. DESTINATION: final occupied cell. CONTACT: a destination or direct swap; intermediate drawn route points do not create hits in P1.0. PUSH: displace an allied MA one position forward on that allied MA's Land-style lane path. CLASH: opposing simultaneous arrivals or a direct swap; stronger POWER survives, ties destroy both. SURPRISE: a moving MA attacks a stationary opposing MA; equality favors the attacker. BREACH: one point earned when an MA at the opponent's Wall attempts its next auto-move.

## 3. Coordinates, Board and Exact Snake Routes

### P1-BRD-01 — Fixed coordinates and orientation

Use the existing editor's (x,y): x increases screen-right from 1 to 6; y increases screen-down from 1 to 8. The board's compass is intentionally rotated relative to the screen: NORTH=(−1,0), SOUTH=(+1,0), WEST=(0,−1), EAST=(0,+1). West faces EAST and East faces WEST. Hence West's LEFT=NORTH and RIGHT=SOUTH; East's LEFT=SOUTH and RIGHT=NORTH. These definitions are FINAL for this prototype, even if a later design rotates the visuals.

### P1-BRD-02 — Borders, Barriers and lane pattern

L1 consists of x=1,2; L2 of x=3,4; L3 of x=5,6. Borders are at vertex x=2 and x=4. Use the REPEATED, left-first Barrier pattern in ALL lanes: at row separator y=1 the lane's northern (odd-x) cell edge is blocked; at y=2 the southern (even-x) cell edge is blocked; alternate similarly through y=7. Display Walls at y=0 and y=8 (grid vertices), and Boundaries at x=0 and x=6. A Barrier occupies an edge, not a cell. Other editor pattern selectors are disabled in the rules prototype.

### P1-BRD-03 — Land route, fully specified

For a lane with northern/odd column a ∈ {1,3,5}, WEST's ordered 16-cell route P_W[a] is: (a,1),(a+1,1),(a+1,2),(a,2),(a,3),(a+1,3),(a+1,4),(a,4),(a,5),(a+1,5),(a+1,6),(a,6),(a,7),(a+1,7),(a+1,8),(a,8). Index 0 is the West entry; index 15 is the enemy-facing Wall cell. EAST uses the exact reverse of that route, so East starts at (a,8) and ends at (a,1). Every adjacent pair is one cardinal cell step and none crosses a Barrier or Border.

Define lane(x)=ceil(x/2); ownProgress(owner,cell) = the index of that cell in P_owner[lane(x)]. Each cell is in exactly one route per owner. UP_LANE means index+1; DOWN_LANE means index−1. The Land path cannot leave its lane. For Sea/Air, this same path index is used ONLY to rank which friendly asset is frontmost; their movement does not follow the snake.

### P1-BRD-04 — Restrictions by type

LAND obeys its snake route and therefore never crosses Borders or Barriers. SEA ignores Borders and Barriers when moving across grid cells, but never leaves the board. AIR may jump over Borders and Barriers and ignores intermediate occupancy, but all final cells must be on the board. No card moves outside a Boundary. Only an attempted automatic forward move from the opposing Wall generates a breach; reaching a Wall does not score immediately.

## 4. Temporary Cards and Player Setup

### P1-CARD-01 — Placeholder roster (replace with actual card descriptions later)

Per player, create four permanent Signals: L1, L2, L3, END. Each Signal costs 0, cannot be destroyed/discarded, and is always available again next turn. Each also appears exactly once in the owner's Order stack.

Temporary supply per player (12 distinct physical cards): 4× Infantry [LAND, Cost 1, Power 2, TW 0]; 2× Patrol Boat [SEA, Cost 2, Power 2, TW 1]; 2× Aircraft [AIR, Cost 3, Power 3, TW 2]; 2× Move Left [ACTION, Cost 1, TW 0]; 2× Move Right [ACTION, Cost 1, TW 0]. There is no Tank, bonus Power, extra-hit, home-field modifier, or other special ability in P1.0.

### P1-CARD-02 — Initial inventory and draws

At setup each player starts with their four Signals, one Infantry and one Move Right Action in hand. Shuffle the remaining 10 non-Signal cards into their own draw pile using a stored pseudorandom seed for reproducible tests. On turn 1, draw ONE additional card. On each turn 2 and later, draw TWO cards, or as many as remain in the draw pile. There is no hand-size limit; do not reshuffle discard into the draw pile because it returns by TW.

At the start of EVERY turn, first return cards whose discard TW already equals 0, then decrease each remaining positive discard TW by 1, then draw, then set available Resources. Unrevealed cards below END are returned to hand unchanged at turn cleanup; they remain private. Surviving on-board Assets are not part of the next hand.

### P1-CARD-03 — Resource economy

On turn number t, each player receives exactly R=t Resources (1,2,3,...), with no cap in P1.0. This is the total spendable budget for that turn, NOT a bank carrying over Resources from earlier turns. Each successfully played Action or Asset reduces available Resources by its printed Cost; Signals are free. All leftover Resources expire after Resolution.

A play is 'successful' for payment purposes if the revealed card has a legal target/selected lane and the player can afford its Cost at the start of that reveal beat. Pay then, even if a subsequent Clash destroys the newly deployed MA or blocks an otherwise legal effect. If the card has no valid target, invalid off-board destination, or insufficient Resources, it FAILS to play: no Resource is deducted and the revealed card returns to hand at cleanup (not discard). A legal play that later fizzles because of a collision still pays.

### P1-CARD-04 — Turn Wait

On entering normal discard during turn t, each card receives its printed TW. At the beginning of turn t+1: first return cards at TW=0, then reduce positive counters. Thus TW=0 returns on t+1; TW=1 returns on t+2; TW=2 returns on t+3. No card may return mid-turn. TW=−1 is a reserved permanent-discard sentinel; none of the temporary starting cards uses −1, but the rules engine should support it. Signals never enter discard.

## 5. The Two-Phase Turn Procedure

### P1-TURN-01 — Start of turn

Increment turn counter t (starting at 1); recover available discarded cards as defined above; draw; refresh Resources to t; clear this turn's revealed-signal lists, autoMoved flags and order stacks. In hot-seat play, conceal the prior player's hand before accepting the next player's order.

### P1-TURN-02 — Order Phase, private commitment

Each player must place their ENTIRE available hand into a single face-down ordered stack, including all four Signals; the stack's top card is executed first. When putting an Asset into the stack, choose its deployment lane (L1/L2/L3). When putting a Move Left/Right Action in the stack, choose a target lane. These choices stay hidden until the card reveals. END can be placed anywhere; everything below a player's END will stay unrevealed, and unrevealed lane Signals will NOT auto-move a lane. Neither player can alter their stack once both have committed.

### P1-TURN-03 — Order Phase, simultaneous reveal beats

In each beat, every player who has not yet shown END reveals precisely their next top card. Both cards and their selected lanes are exposed together before effects resolve. An END stops that player for the rest of this Order Phase; the other player continues revealing on later beats until their own END. An exposed L1/L2/L3 Signal is appended to its owner's revealed-lane sequence in the order exposed, but does not immediately auto-move a lane. The game cannot enter Resolution until BOTH players have exposed END.

For each beat, validate both costed cards independently against the same pre-beat snapshot and each owner's current Resource budget; deduct legal costs. Build at most one movement/deployment intent per player. Resolve valid intents simultaneously using Section 7 (including Clash/Surprise/Push). Valid Actions go straight to discard after applying their intent; successful Asset cards remain on the board if they survive, otherwise go to discard. Failed costed cards are revealed but return to hand at cleanup. END and lane Signals always return to hand at cleanup.

### P1-TURN-04 — Resolution Phase, lane waves

Take each player's list of revealed L1/L2/L3 Signals. Wave k uses the kth item in West's list, if any, simultaneously with the kth item in East's list, if any. Example: West reveals [L3,L1], East reveals [L1,L3]; wave 1 runs West L3 together with East L1, wave 2 runs West L1 together with East L3. A lane Signal below END was not revealed and produces no wave. One revealed lane Signal activates all eligible MAs of that owner currently in that lane, subject to the frontmost-first rule.

At the START of each wave, snapshot all currently eligible friendly MAs in each activated lane; exclude cards that have already auto-moved this turn. Sort West's selected MAs by decreasing ownProgress and East's selected MAs the same way. Rank 1 of each active side submits an auto-move simultaneously; resolve the pair. Then rank 2 of each side submits together, etc., until those frozen lists are exhausted. An MA displaced or killed before its rank acts from its updated position if still on board, or does nothing if removed. Mark an MA autoMoved when it submits its move (even if blocked or destroyed). A MA that later switches lanes CANNOT auto-move again in another wave during this turn.

### P1-TURN-05 — Cleanup and end

After the final wave, expire unused Resources. Return all Signals, failed-play cards and cards hidden below END to their owners' hands. Played Actions stay in discard until their TW recovery turn; deployed surviving Assets stay on board. Update both players' breach points, apply the victory rule, and if no winner start the next turn.

## 6. Manual Move Actions and Deployment

### P1-MOVE-01 — Targeting a Move Action

A Move Action targets the single FRONTMOST friendly MA in the chosen lane at the start of its reveal beat. If none exists, the Action fails to play, costs nothing and returns to hand at cleanup. If multiple MAs somehow tie on path index, the lowest permanent card ID wins (a defensive deterministic rule); normal one-card-per-cell occupancy prevents an actual tie within a lane. No stationary non-Military Asset can be targeted by Move Actions.

### P1-MOVE-02 — LEFT / RIGHT by MA type

LAND interprets RIGHT as +1 own snake-path index (UP_LANE), and LEFT as −1 (DOWN_LANE), regardless of compass orientation. LAND cannot change lane; a move outside index 0..15 is invalid and the Action fails. SEA interprets player-facing LEFT/RIGHT as one horizontal-editor-column step (West LEFT x−1 / RIGHT x+1; East LEFT x+1 / RIGHT x−1). SEA may cross a Border but cannot step outside x=1..6. AIR interprets LEFT/RIGHT as a two-column jump to the same relative side of the adjacent lane (West LEFT x−2 / RIGHT x+2; East LEFT x+2 / RIGHT x−2). AIR ignores the intervening cell; a missing adjacent lane makes the Action invalid. For all three types, y stays unchanged under the Action.

### P1-MOVE-03 — Playing an MA

A played MA must have a selected lane. Its owner starts it at path index 0 of that lane (West at (a,1), East at (a,8), a=1/3/5), and as one deployment event advances it one step to path index 1 to clear the entry. The index-0 animation is visual-only: combat and occupancy apply to the final index-1 cell, and the entry is never an intermediate hit. This deployment occurs during Order and does not use up the later auto-move. If the index-1 cell contains an allied MA, apply Push. If it contains an enemy MA, use Surprise. A unit destroyed during deployment is still a successfully played, paid-for card. Failed geometry and absent lane selections cost nothing.

## 7. Automatic Movement by Type

### P1-AUTO-01 — General wall and endpoint behavior

At auto-move time, if an MA is ALREADY in its enemy-facing terminal Wall cell, it generates ONE breach point for its owner and goes to its normal discard (with printed TW) rather than moving. Enemy Wall means path index 15 for Land; y=8 for West Sea/Air; y=1 for East Sea/Air. An MA reaching that cell FROM SOMEWHERE ELSE during its auto-move remains on board and does not breach until a subsequent activated auto-move. Auto-moves that would overshoot the enemy Wall are CLAMPED to the Wall cell. Ordinary Move Actions never score a breach. An MA directed backward beyond its own Wall simply cannot move (an Action pointing off-board is invalid; auto movement always moves toward the enemy).

### P1-AUTO-02 — Land

Land automatically advances TWO ordered snake-path positions from its current cell, without changing lanes. For current index i<15 the intended index is min(i+2,15). The whole two-position relocation is one atomic intent. Only the FINAL destination is a collision/contact cell in this prototype; the intermediary path cell is transit, not a second attack. If Land begins at i=15, use the breach rule instead.

### P1-AUTO-03 — Sea

Sea makes a three-primitive-step geometric maneuver with a single final contact: (1) one cell NORTH (x−1), crossing a Border if needed; if x=1 would hit the North Boundary, move one cell SOUTH instead; (2) one cell FORWARD; (3) one additional cell FORWARD. Ignore Barriers for Sea. Clamp forward distance at the enemy Wall rather than leaving the board. The two forward cells may be visually animated as crossing a Barrier, but only the final destination interacts with pieces. The resulting ordinary Sea auto-move is x'=x−1 if x>1, otherwise x'=2; y'=min(y+2,8) for West or max(y−2,1) for East. If already at the enemy Wall at the beginning, breach instead.

### P1-AUTO-04 — Air

Air performs one atomic north-first sweep: travel up to THREE cells NORTH while remaining within the North Boundary; travel ONE cell FORWARD; return SOUTH by exactly the same number of cells actually travelled north; then travel ONE more cell FORWARD. The north/south legs are flight paths that never contact or attack intervening cells. Only the FINAL landing cell participates in Push/Clash/Surprise. Net displacement is two FORWARD cells with the same x, unless blocked at a Wall. For example, West Air at (4,2) traces north to (1,2), forward to (1,3), south back to (4,3), forward to (4,4), and contacts only (4,4). If already at the enemy Wall at the start, breach instead.

### P1-AUTO-05 — Rationale for simplified contact

P1.0 uses final-destination contact and direct swapping only, deliberately omitting collisions along a rendered intermediate trajectory. This resolves the earlier conflict between 'multiple one-cell steps' and 'all steps resolve simultaneously' without requiring a complex continuous-geometry intersection engine. Future card descriptions can introduce multi-hit, overflight attack, or intermediate-cell contact explicitly. Animations must never change which encounters occur.

## 8. Collision, Push and Combat Priority

### P1-COM-01 — One occupier per cell

Each cell may contain at most one persistent Asset after any beat or rank-pair resolves. During an atomic event, each side may submit one movement intent, but temporary overlap is resolved BEFORE committing any final positions. A frozen starting snapshot determines which defenders are stationary for that event.

### P1-COM-02 — Simultaneous Clash

Two opposing MA movement intents CLASH if their final destinations are the same cell OR if they directly exchange each other's origin cells during the same event (a swap). Compare their printed POWER (no modifiers in P1.0). Stronger MA survives and the weaker goes to discard; equal POWER sends both to discard. If both entrants tie while a third stationary MA occupies the destination, that third MA remains unchanged. If one entrant survives, resolve its destination against any stationary occupant next.

### P1-COM-03 — Surprise

After incoming-versus-incoming Clash, a surviving moving MA whose final destination contains a STATIONARY enemy MA performs a SURPRISE. If moving POWER ≥ defender POWER, discard defender and allow mover into the cell. If moving POWER < defender POWER, discard mover and leave defender in place. Equality therefore destroys both in a Clash but favors the mover in a Surprise.

### P1-COM-04 — Friendly Push and blocked chains

When a surviving mover's destination contains a stationary friendly MA, recursively move that occupant +1 index on its OWN snake route, then any friendly MA occupying the next cell, until an empty destination is found. Execute the chain from farthest to nearest, then place the original mover. Pushing across a Border is never allowed; Push uses the displaced MA's snake-path index. If any pushed destination is beyond the enemy Wall, contains an enemy MA, or cannot be cleared, the entire Push chain is canceled and the original mover remains in its origin. No damage or discard occurs from the failed push. The attempted play remains paid if it was legal to begin with.

### P1-COM-05 — Stationary non-MA Assets

For testing only, a debug-spawned permanently stationary non-MA Asset is destroyed whenever a moving MA contacts its cell, regardless of ownership, without Power comparison. The MA proceeds into the vacated cell. These Assets are not in the temporary starting deck; real cards may later define more selective destruction or defensive effects.

### P1-COM-06 — Deterministic resolution algorithm

Resolve each beat/rank-pair in this order: (1) freeze origin positions, ownership, selected intents and available Resources; (2) compute all legal final destinations and any breach intents; (3) resolve simultaneous opposing same-destination or direct-swap Clashes; (4) remove destroyed units and score simultaneous breaches; (5) resolve each surviving entrant against truly stationary enemy defenders (Surprise) or stationary non-MA Assets; (6) apply allied Push chains; (7) commit surviving destinations together; (8) put destroyed/breached cards into discard. A defender that is itself an active mover in this pair and vacates its origin is NOT stationary; two movers merely entering one another's old cells without a direct swap are allowed. If a rare remaining tie needs an iteration order, use ascending permanent card ID, not player precedence.

A direct overlap of a valid deployment and a Move Action uses exactly the same algorithm. Each rank-pair uses the board state produced by the preceding rank-pair, so the frontmost-first rule is meaningful while West and East remain simultaneous at each rank. A card eliminated before its pending rank cannot move. No special home-field advantage is active.

## 9. Victory and Match Limit

### P1-WIN-01 — Breaches and winning

Each MA auto-moving from its opponent-facing Wall earns its owner ONE BREACH point, then leaves the board for normal TW discard. Breaches earned by opposite players in the same rank-pair are both recorded. Complete the current entire turn before checking victory, even if a player reaches the winning threshold mid-wave. At turn end, if at least one player has ≥2 total breach points and one has MORE breach points than the other, the leader wins. If both have equal breach points at or above 2, play on until someone leads or the match limit occurs.

### P1-WIN-02 — Twelve-turn safety limit

If nobody has won by the end of turn 12, the player with more breach points wins. On equal breach points, the player with greater SUM of printed Power of surviving on-board MAs wins. If still equal, the match is a DRAW. This cap is for fast browser playtests rather than an assertion about the final game's preferred length.

## 10. Suggested Minimal Engine State

For each player: playerId, facing (WEST/EAST), turn, resources, breachPoints, persistentSignals[4], drawPile[cardId], hand[cardId], discard[{cardId,twRemaining}], committedStack[{cardId,chosenLane}], revealedLaneOrder[laneId]. For the game: seed, board[6][8], activeCards, phase, beatIndex, waveIndex, logs, gameResult. Each MA: cardId, owner, category='ASSET', type, cost, power, printedTW, x, y, autoMoved. Each Action: cardId, owner, direction, chosenLane, cost, printedTW. Use stable card IDs, not card names, for ties.

All public actions should be reproducible from {initialSeed, both players' committed hidden orders, per-card selected lanes}. The engine should generate an ordered event log: DRAW, COMMIT, REVEAL, PLAY_OK/PLAY_FAIL, SIGNAL, INTENT, CLASH, SURPRISE, PUSH, DESTROY, BREACH, DISCARD, RECOVER, CLEANUP, WIN. Keep hidden card identities private to the opposing player until revealed.

## 11. Reference Pseudocode

```text
startTurn(t):
  for player in [WEST, EAST]:
    return discard cards where twRemaining == 0 to hand
    decrement twRemaining by 1 for cards where twRemaining > 0
    draw 1 card if t == 1 else up to 2 cards
    player.resources = t
    player.revealedLanes = []
  reset autoMoved on board MAs
ORDER:
  each player commits all hand cards, including L1,L2,L3,END, with per-card lane choices
  while WEST not ended or EAST not ended:
    reveal the top card of every not-ended player simultaneously
    if END: mark that player ended
    if lane Signal: append its lane to that player's revealedLanes
    validate both costed cards against one pre-beat snapshot and each player's resources
    deduct costs for all legal, affordable plays
    create movement/deployment intents for paid plays
    resolveIntentPair(intents) // same-destination or swap clash, then surprises, then pushes
    valid played Actions -> discard; failed cards -> return to hand later
RESOLUTION:
  for k in 0 .. max(length(WEST.revealedLanes),length(EAST.revealedLanes))-1:
    for player:
      lane = player.revealedLanes[k] or NONE
      list[player] = frontmost-first current un-autoMoved MAs in lane (snapshot)
    for rank in 0 .. max(length(list[WEST]),length(list[EAST]))-1:
      candidate[player] = current surviving list[player][rank] or NONE
      if candidate already at enemy Wall: produce breach intent
      else: produce type-specific atomic auto-move intent
      mark candidate autoMoved
      resolveIntentPair(candidate intents and breaches)
  expire Resources; return Signals, failed cards and unrevealed cards below END to hand
  check 2-breach winner or 12-turn tiebreaker
```

## 12. Acceptance Tests for the First Prototype

P1-TEST-01 — Board geometry: 6×8; Borders at column seams 2/3 and 4/5; seven alternating Barriers per lane; 16 unique cells in each Land route; consecutive route cells are orthogonally adjacent, do not cross a Barrier, and West/East routes are exact reversals.

P1-TEST-02 — Starting position: deploy West Infantry into L1. Entry animation begins (1,1); final board cell is route index 1 = (2,1). On L1 auto activation that same turn, its two-position Land move finishes at index 3 = (1,2). East L1 deployment ends at (2,8), East path index 1.

P1-TEST-03 — Movement directions: West Sea RIGHT from (1,2) → (2,2); East Sea RIGHT from (2,2) → (1,2). West Air RIGHT from (1,2) → (3,2); East Air RIGHT from (3,2) → (1,2). Land RIGHT increases own snake index by 1; Land LEFT decreases it by 1.

P1-TEST-04 — Auto Sea/Air: West Sea at (2,2) auto-moves to (1,4). West Air at (4,2) follows the north-first sweep and finishes at (4,4); its intermediate route does not attack occupied cells. All destinations must remain within 1≤x≤6, 1≤y≤8.

P1-TEST-05 — Signal wave pairing: West revealed [L3,L1], East revealed [L1,L3]. Wave 1 processes West L3 with East L1, wave 2 processes West L1 with East L3. Any lane Signal below END never activates a wave, and no MA auto-moves twice if it shifts lanes.

P1-TEST-06 — END privacy: with stack [L1, Infantry(L1), END, L2, Move Right(L3), L3], only first three reveal; the last three stay hidden and return to hand. The opponent may continue reveal beats after this player's END.

P1-TEST-07 — Resource validation: turn 3 provides exactly R=3. Legal cost-2 card deducts 2; failing cost-2 play due to insufficient remaining funds deducts 0; unused Resource expires. A played Infantry destroyed in the same beat still costs 1.

P1-TEST-08 — TW recovery: Action with TW=0 discarded on turn 2 is usable again on turn 3. Patrol Boat TW=1 discarded turn 2 reaches 0 at turn-3 start, returns on turn 4. TW=−1 stays permanently unavailable.

P1-TEST-09 — Clash versus Surprise: two simultaneous moving Power-2 MAs reach the same target cell: both discarded. Moving Power-2 attacks stationary opposing Power-2: attacker survives, defender discarded. Moving Power-1 against stationary opposing Power-2: attacker discarded, defender remains.

P1-TEST-10 — Third occupant: opposing moving Power 3 and Power 2 enter a cell with stationary Power 2 enemy of the higher-Power entrant; first Clash leaves the Power-3 entrant, then Surprise defeats stationary Power-2. With equal entrant powers, both die and original occupant remains.

P1-TEST-11 — Push and blocking: friendly piece at path index i is pushed to i+1 by an arriving friendly mover, even if physical direction changes around a Barrier. A friendly chain may be pushed if its farthest member has an empty next cell. A blocked chain cannot push past a Wall or into an opposing MA; originating mover remains at its initial cell.

P1-TEST-12 — Breach delay: West Land at index 14 advances to index 15 without scoring; its NEXT L1 auto activation scores exactly 1 and sends it to normal discard. A West Sea or Air already at y=8 similarly breaches when its lane is activated. Moving by an Action into the Wall cell does not score.

P1-TEST-13 — Two simultaneous breaches: both players breach in the same rank-pair; both receive 1. Victory is checked only after the full turn, and tied scores ≥2 do not instantly award a winner.

P1-TEST-14 — Turn limit: at end turn 12, compare breaches, then total on-board MA printed Power; exact equality is a DRAW. A surviving Unit's Position must not produce an unlisted bonus.

P1-TEST-15 — Determinism: running the same initial seed and same committed stacks twice yields an identical sequence of event logs, final board cells, discard timers, Resources and breach scores. No result may depend on render/animation order.

## 13. Conflict Decisions and Deferred Features

DECISION A — Original draft left world direction versus editor direction open; P1.0 permanently uses N=x−1, S=x+1, W=y−1, E=y+1, preserving paired vertical editor lanes. All three lanes use the repeated snake pattern.

DECISION B — Original draft described both one- and two-cell Land auto movement. P1.0 selects TWO path positions. Each side's exact 16-cell snake route is enumerated, East reversing West.

DECISION C — Original draft did not define whether Signals below END activate. P1.0 says NO: players may deliberately skip or delay lane auto-movement by hiding a Signal below END. Revealed Signals are paired by ordinal position in the revealed sequences.

DECISION D — Original draft mixed atomic movement, intermediate physical hits and frontmost-first priority. P1.0 evaluates one endpoint contact per atomic move, with opposing same-rank pair simultaneity and same-owner frontmost-first ranks. No transit attacks, complex path intersections or multiple hits.

DECISION E — Original draft's Sea maneuver and Air board-edge behavior were incomplete. P1.0 selects Sea's 1N (or south at North Boundary) + 2F final landing, and Air's clamped 3N + 1F + reverse-S + 1F final landing. These are placeholders, not claims about final intended motion.

DECISION F — Original draft's home-field, Wall hits, pushing and winning were contradictory/incomplete. P1.0 disables special home-field and Tank bonuses, uses chain Push with blocking, and uses one delayed breakthrough point per Wall breach. First to 2 breaches with a 12-turn cap is TEST ONLY.

DECISION G — Original draft did not provide card list, deck size, costs for Signals, draw schedule, action targets, failed-play routing or resource definition of successful play. P1.0 adopts reusable zero-cost Signals, a tiny temporary seeded deck, explicit per-card lane choices, no resource penalty for illegal plays, and normal TW on spent Actions/removed Assets.

OUT OF SCOPE until real card descriptions arrive: named combat abilities, modified Power values (Tank=4), home-field advantage, additional Action types, stationary Asset cards in the starting supply, overflight damage, area attacks, persistent effects, permanent-discard abilities, online multiplayer, drafting/deckbuilding and generalized board dimensions. The engine may expose debug spawn controls for testing stationary Asset destruction.

DESIGN SAFETY: The prototype implementation must read THIS document as the definitive vP1.0 test specification. Do not automatically reinstate contradictory OPEN questions from the original reference document. Every deviation from this test specification should be versioned and backed by an acceptance test.

### Change Log

P1.0 — November 23, 2026: Replaced the copied brainstorming draft with one internally consistent, unofficial playable prototype rulebook; fixed board orientation, snake paths, signals, movement and combat scheduling, temporary cards, economy and discard recovery, wall scoring, victory conditions, data model and acceptance tests. The source Rules & Mechanics document remains unchanged.
