/*

Final Game Project

Game Description: Our game character is called Hat. It has three lives and one objective, to reach the flagpole.
On the way it can pick up collectables to gain points. It needs to avoid falling
into the canyons to stay alive. We also have an enemy spaceship that keeps chasing Hat. 
Whenever the enemy ship hovers over Hat, we lose points, and if we're left with zero points, then 
a life is lost. Reaching the flagpole results in bonus points and wins the game!

Extension 1: Platforms using Factory Pattern

The platforms that the character can jump to and from in the game are created using the factory pattern. 
Factory function takes some arguments and returns an object whose properties are assigned from the arguments.

By using factory function, I understood that if we need to create a number of similar objects with variable properties, 
we can use a single function. The function is a way of creating the object and arguments let us specify the properties
of the object.

However, using factory pattern requires us to know beforehand how many objects there are and what values their 
properties will have. Alternatively we can use a for loop over an array to generate multiple objects, but even then the
arguments needed to pass into each iteration need to be normalized, adding one more step of computation.


Extension 2: Sound using Howler.js

Game sounds have been kept minimalist to avoid making the user experience chaotic or fatiguing. The Howler library
has been used to implement sounds. Howler.js provides a library of functions that can be used to import and play sounds
in the browser. User interaction like jumping and collecting points trigger different sound files in the game.
Change in game state, like the character falling into a canyon, also triggers a sound.

The challenging part about implementing sound in the game was managing the calls to play or pause sound inside the
draw() function of p5. Since draw is called repeatedly many times per second, any state of the system is rendered 
repeatedly. This causes the play or pause sound functions to also get called repeatedly. As these calls stack up the 
same sound file is played repeatedly which breaks the code. I learnt to evade this possibility by attaching methods for
triggering or stopping the sound file with state shift booleans, that automatically handle the event triggers.

Other notes: Using consructor function to create lava effect

The tutorial videos and some projects in the Sleuth series provided us with the tools to create visual effects with 
p5 using constructor functions. I tried using the skills I learnt from them to create the boiling lava effect at the
top of the canyons. Playing with the different parameters helped me get nearly the exact effect I could visualize,
although I feel it could be made better with more practice and experimenting. 

Credits: Please find the credits to external resources in the attached credits.md file.


*/






// Declare global variables

var gameChar;
var gameChar_x;
var gameChar_y;
var floorPos_y;
var scrollPos;
var gameChar_world_x;
var playerDead

var isLeft;
var isRight;
var isFalling;
var isPlummeting;
var bgColor;
var groundColor;

var canyons;
var collectables;
var clouds;
var mountains;
var trees_x;
var game_score;
var flagpole;
var lives;
var platforms;
var soundPaths;
var dieSound;
var jumpSound;
var pointSound;

var gcPhys;

var lavaDots;

var enemyShip;
var enemyShipImg;

var rockPattern;

var gamePause;


// Function to preload game sounds
// Howler.js library is being used to perform audio tasks

function preload() {
    dieSound = new Howl({
        src: ['assets/sounds/die.ogg'],
        autoplay: false
    });
    jumpSound = new Howl({
        src: ['assets/sounds/jump.mp3'],
        autoplay: false
    });
    pointSound = new Howl({
        src: ['assets/sounds/point.mp3'],
        volume: 0.5,
        autoplay: false
    });

// Preload other assets 

    enemyShipImg = loadImage('assets/images/enemyShip.png');
    rockPattern = loadImage('assets/images/rock_pattern.jpeg');
    
}


function setup() {

    const canvas = createCanvas(displayWidth, displayHeight);
    const graphics = createGraphics(displayWidth, displayHeight, WEBGL)
    

    gamePause = true;

// Code to pause the game 
// gamePause is initialized to true to start the game in a paused state

    if(gamePause) noLoop();
    canvas.mousePressed(function() {
        gamePause = !gamePause;
        gamePause ? noLoop() : loop();
    })

    floorPos_y = displayHeight * 3 / 4;
    lives = 3;   // set total number of lives
    
    game_score = 50


    startGame();


}

function draw() {

    background(bgColor); // fill the sky blue
    noStroke();


    fill(97, 151, 53); // draw some green ground
    rect(0, floorPos_y, width, height / 4);


    //code for scrolling begins
    push();
    translate(scrollPos * 0.99, 0);
    drawMountains();
    pop()

    push();
    translate(scrollPos, 0);



    // Draw scenery

    drawClouds();
    drawTrees();

    // Check whether flagpole has been reached

    if (!flagpole.isReached) 
    {
        checkFlagpole();
    }

    // Draw flagpole

    renderFlagpole();

    // Falling down canyons

    if (isPlummeting) 
    {
        gameChar_y += gcPhys.gravity;
    }


    // Draw canyons

    for (let i = 0; i < canyons.length; i++) {

        drawCanyon(canyons[i]);
        checkCanyon(canyons[i]);

    }
   
    // Draw the enemy ship
    
    drawEnemyShip();

    // Move the enemy ship to chase the game character

    moveShip();

    // Draw collectable items.
    for (let i = 0; i < collectables.length; i++) 
    {

        if (!collectables[i].isFound) 
        {
            drawCollectable(collectables[i]);
            checkCollectable(collectables[i]);

        }

    }

    // Draw platforms

    for (let i = 0; i < platforms.length; i++) 
    {
        platforms[i].draw();

    }

    pop();
    
    // code for scrolling ends

    // Draw the game character

    drawGameChar();
    
    checkPlayerDie();
    


    // Draw the lives counter

    drawLives();
    
    // Reduce score when enemy ship is targeting game character

    //reduceScore();
    if(inRange() && !playerDead)
    {
        game_score -= 2;
    }

    // Render the rocky bed

    for(let i = 0; i < Math.ceil(displayWidth/100); i++)
    {
        image(rockPattern, (i * 100), displayHeight - 100);
    }
   
    // Function to render in-game text

    renderText()

    // Logic to make the game character move or the background scroll.

    if (isLeft) {
        if (gameChar_x > width * 0.2) {
            gameChar_x -= gcPhys.x_vel;
            gcPhys.x_vel += gcPhys.x_acceleration;
        }
        else {
            scrollPos += 5;
        }
    }

    if (isRight) {
        if (gameChar_x < width * 0.8) {
            gameChar_x += gcPhys.x_vel;
            gcPhys.x_vel += gcPhys.x_acceleration;
        }
        else {
            scrollPos -= displayWidth/400; // negative for moving against the background
        }
    }

    // Logic to make the game character rise and fall.

    if (gameChar_y < floorPos_y) 
    {
        let isOnPlatform = false;
        for (let i = 0; i < platforms.length; i++) {
            if (platforms[i].checkContact(gameChar_world_x, gameChar_y)) 
            {
                gameChar_y = platforms[i].y
                isOnPlatform = true;
                break;
            }
        }
        if (!isOnPlatform) 
        {
            gameChar_y += gcPhys.gravity;
            isFalling = true;
        }
    }
    else 
    {
        isFalling = false;
    }


    // Update real position of gameChar for collision detection.
   
    gameChar_world_x = gameChar_x - scrollPos;


}


// ---------------------
// Key control functions
// ---------------------

function keyPressed() {

    // left key pressed

    if (keyCode == 37) 
    {
        isLeft = true;
    }

    // right key pressed

    if (keyCode == 39) 
    {
        isRight = true;
    }

    // Spacebar pressed
    // checks if character is on a platform or on the ground

    for (let i = 0; i < platforms.length; i++) {
        if (keyCode == 32 && (gameChar_y == floorPos_y || gameChar_y == platforms[i].y)) 
        {
            gameChar_y -= gcPhys.jumpRange;
            jumpSound.play()
        }
    }

    // Game resets after reaching flagpole or lives are exhausted

    if ((flagpole.isReached || lives == 0) && keyCode == 32) {
        startGame();
    }

}

function keyReleased() 
{

    if (keyCode == 37) 
    {
        isLeft = false;
        setTimeout(decelerate(), 300);
        
    }
    if (keyCode == 39) 
    {
        isRight = false;
        setTimeout(decelerate(), 300);
    }
    if (keyCode == 32 && gameChar_y == floorPos_y) 
    {
        isFalling = true;
    }

}


// ------------------------------
// Game character render function
// ------------------------------

// Function to draw the game character

function drawGameChar() {
    // draw game character

    if (isLeft && isFalling && !flagpole.isReached) {
        // jumping-left code

        // head
        fill(57, 55, 91);
        ellipse(gameChar_x, gameChar_y - 1.2*gameChar.height/2, gameChar.sideWidth, gameChar.height);

        // eyes
        fill(245, 176, 203);
        ellipse(gameChar_x - gameChar.width/5, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter*3/4);
        fill(57, 55, 91)

        ellipse(gameChar_x - gameChar.width/5, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter*3/8);


        // mouth
        fill(213, 151, 206);
        rect(gameChar_x - gameChar.sideWidth/2.5, gameChar_y - 0.4 * gameChar.height, gameChar.sideWidth/2.5, gameChar.height/25);
        
        // hat
        fill(116, 92, 151);
        stroke(57, 55, 91);
        push();
        translate(gameChar_x + gameChar.width/2, gameChar_y - gameChar.height);
        rotate(PI / 12);
        triangle(-gameChar.width, 0, 0, 0, -gameChar.width/2, -0.25*gameChar.height);
        pop();
        noStroke();


        // right fin
        fill(116, 92, 151);
        stroke(57, 55, 91);
        push();
        translate(gameChar_x + gameChar.sideWidth/2, 
            gameChar_y - 0.6*gameChar.height);
        rotate(PI / 5);
        triangle(0, 0, .4*gameChar.sideWidth, -.2*gameChar.height, .4*gameChar.sideWidth, .2*gameChar.height);
        pop();
        noStroke();

        // skateboard
        stroke(57, 55, 91);
        fill(116, 92, 151);
        push();
        translate(gameChar_x, gameChar_y - 0.1*gameChar.height);
        rotate(-PI / 12);
        triangle(- gameChar.width/2.5, 0.1*gameChar.height, gameChar.width/2.5, 0.1*gameChar.height, 0, 0);
        pop();
    }
    else if (isRight && isFalling && !flagpole.isReached) {
        // jumping-right code

        // head
        fill(57, 55, 91);
        ellipse(gameChar_x, gameChar_y - 1.2*gameChar.height/2, gameChar.sideWidth, gameChar.height);


        // eyes
        fill(245, 176, 203);

        ellipse(gameChar_x + gameChar.width/5, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter*3/4);
        fill(57, 55, 91)

        ellipse(gameChar_x + gameChar.width/5, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter*3/8);

        // mouth
        fill(213, 151, 206);
        rect(gameChar_x + gameChar.sideWidth/8, gameChar_y - 0.4 * gameChar.height, gameChar.sideWidth/2.5, gameChar.height/25);

        // hat
        fill(116, 92, 151);
        stroke(57, 55, 91);
        push();
        translate(gameChar_x - gameChar.width/2, gameChar_y - gameChar.height);
        rotate(-PI / 12);
        triangle(0, 0, gameChar.width, 0, gameChar.width/2, -.25*gameChar.height);
        pop();
        noStroke();

        // left fin
        fill(116, 92, 151);
        stroke(57, 55, 91);
        push();
        translate(gameChar_x - gameChar.sideWidth/2, gameChar_y - 0.6*gameChar.height);
        rotate(-PI / 5);
        triangle(0, 0, -.4*gameChar.sideWidth, -.2*gameChar.height, -.4*gameChar.sideWidth, .2*gameChar.height);
        pop();
        noStroke();


        // skateboard
        stroke(57, 55, 91);
        fill(116, 92, 151);
        push();
        translate(gameChar_x, gameChar_y - 0.1*gameChar.height);
        rotate(PI / 12);
        triangle(- gameChar.width/2.5, 0.1*gameChar.height, gameChar.width/2.5, 0.1*gameChar.height, 0, 0);
        pop();

    }
    else if (isLeft && !flagpole.isReached) {

        // walking left code

        // head
        fill(57, 55, 91);
        ellipse(gameChar_x, gameChar_y - 1.2*gameChar.height/2, gameChar.sideWidth, gameChar.height);

        // eyes
        fill(245, 176, 203);
        ellipse(gameChar_x - gameChar.width/5, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter*3/4);
        fill(57, 55, 91)

        ellipse(gameChar_x - gameChar.width/5, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter*3/8);


        // mouth
        fill(213, 151, 206);
        rect(gameChar_x - gameChar.sideWidth/2.5, gameChar_y - 0.4 * gameChar.height, gameChar.sideWidth/2.5, gameChar.height/25);

        // hat
        fill(116, 92, 151);
        stroke(57, 55, 91);
        triangle(gameChar_x - gameChar.width/2, 
            gameChar_y - gameChar.height, 
            gameChar_x + gameChar.width/2, 
            gameChar_y - gameChar.height, 
            gameChar_x, 
            gameChar_y - 1.25*gameChar.height);
        noStroke();


        // right fin
        fill(116, 92, 151);
        stroke(57, 55, 91);
        triangle(gameChar_x + gameChar.sideWidth/2, 
            gameChar_y - 0.6*gameChar.height, 
            gameChar_x + .9*gameChar.sideWidth, 
            gameChar_y - 0.8*gameChar.height, 
            gameChar_x + .9*gameChar.sideWidth, 
            gameChar_y - 0.4*gameChar.height);
        noStroke();

        // skateboard
        stroke(57, 55, 91);
        fill(116, 92, 151);
        triangle(gameChar_x - gameChar.width/2.5, 
            gameChar_y, 
            gameChar_x + gameChar.width/2.5, 
            gameChar_y, 
            gameChar_x, 
            gameChar_y - 0.1*gameChar.height)



    }
    else if (isRight && !flagpole.isReached) {
        // walking right code

        // head
        fill(57, 55, 91);
        ellipse(gameChar_x, gameChar_y - 1.2*gameChar.height/2, gameChar.sideWidth, gameChar.height);


        // eyes
        fill(245, 176, 203);

        ellipse(gameChar_x + gameChar.width/5, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter*3/4);
        fill(57, 55, 91)

        ellipse(gameChar_x + gameChar.width/5, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter*3/8);

        // mouth
        fill(213, 151, 206);
        rect(gameChar_x + gameChar.sideWidth/8, gameChar_y - 0.4 * gameChar.height, gameChar.sideWidth/2.5, gameChar.height/25);

        // hat
        fill(116, 92, 151);
        stroke(57, 55, 91);
        triangle(gameChar_x - gameChar.width/2, 
            gameChar_y - gameChar.height, 
            gameChar_x + gameChar.width/2, 
            gameChar_y - gameChar.height, 
            gameChar_x, 
            gameChar_y - 1.25*gameChar.height);
        noStroke();

        // left fin
        fill(116, 92, 151);
        stroke(57, 55, 91);
        triangle(gameChar_x - gameChar.sideWidth/2, 
            gameChar_y - 0.6*gameChar.height, 
            gameChar_x - .9*gameChar.sideWidth, 
            gameChar_y - 0.8*gameChar.height, 
            gameChar_x - .9*gameChar.sideWidth, 
            gameChar_y - 0.4*gameChar.height);
        noStroke();


        // skateboard
        stroke(57, 55, 91);
        fill(116, 92, 151);
        triangle(gameChar_x - gameChar.width/2.5, 
            gameChar_y, 
            gameChar_x + gameChar.width/2.5, 
            gameChar_y, 
            gameChar_x, 
            gameChar_y - 0.1*gameChar.height);


    }
    else if (!flagpole.isReached && (isFalling || isPlummeting)) {
        // jumping facing forwards code
        // head
        fill(57, 55, 91);
        ellipse(gameChar_x, gameChar_y - 1.2*gameChar.height/2, gameChar.width, gameChar.height);

        // eyes
        fill(245 * random(), 176 * random(), 203 * random());
        ellipse(gameChar_x - gameChar.width/4, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter);
        ellipse(gameChar_x + gameChar.width/4, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter)
        fill(57, 55, 91)
        ellipse(gameChar_x - gameChar.width/4, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter/2);
        ellipse(gameChar_x + gameChar.width/4, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter/2);

        // mouth
        fill(213, 151, 206);
        triangle(gameChar_x - gameChar.width/6, 
            gameChar_y - 0.4 * gameChar.height, 
            gameChar_x + gameChar.width/6, 
            gameChar_y - 0.4 * gameChar.height, 
            gameChar_x, 
            gameChar_y - 0.27 * gameChar.height);

        // hat
        fill(116, 92, 151);
        stroke(57, 55, 91);
        triangle(gameChar_x - gameChar.width/2, 
            gameChar_y - gameChar.height, 
            gameChar_x + gameChar.width/2, 
            gameChar_y - gameChar.height, 
            gameChar_x, 
            gameChar_y - 1.25*gameChar.height);
        noStroke();

        // left fin
        fill(116, 92, 151);
        stroke(57, 55, 91);
        triangle(gameChar_x - gameChar.width/2, 
            gameChar_y - 0.6*gameChar.height, 
            gameChar_x - 0.8*gameChar.width, 
            gameChar_y - 0.6*gameChar.height, 
            gameChar_x - 0.8*gameChar.width, 
            gameChar_y - 0.4*gameChar.height);
        noStroke();

        // right fin
        fill(116, 92, 151);
        stroke(57, 55, 91);
        triangle(gameChar_x + gameChar.width/2, 
            gameChar_y - 0.6*gameChar.height, 
            gameChar_x + 0.8*gameChar.width, 
            gameChar_y - 0.6*gameChar.height, 
            gameChar_x + 0.8*gameChar.width, 
            gameChar_y - 0.4*gameChar.height);
        noStroke();

        // skateboard
        stroke(57, 55, 91);
        fill(116, 92, 151);
        triangle(gameChar_x - gameChar.width/2, 
            gameChar_y, 
            gameChar_x + gameChar.width/2, 
            gameChar_y, 
            gameChar_x, 
            gameChar_y - 0.1*gameChar.height);

    }
    else{
        // standing front facing code

        // head
        fill(57, 55, 91);
        ellipse(gameChar_x, gameChar_y - 1.2*gameChar.height/2, gameChar.width, gameChar.height);

        //eyes
        fill(245 * random(0.7,1), 176, 203);
        ellipse(gameChar_x - gameChar.width/4, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter);
        ellipse(gameChar_x + gameChar.width/4, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter);
        fill(57, 55, 91)
        ellipse(gameChar_x - gameChar.width/4, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter/2);
        ellipse(gameChar_x + gameChar.width/4, gameChar_y - 0.7 * gameChar.height, gameChar.eyeDiameter/2);

        // mouth
        fill(213, 151, 206);
        triangle(gameChar_x - gameChar.width/6, 
            gameChar_y - 0.4 * gameChar.height, 
            gameChar_x + gameChar.width/6, 
            gameChar_y - 0.4 * gameChar.height, 
            gameChar_x, 
            gameChar_y - 0.3 * gameChar.height);

        // hat
        fill(116, 92, 151);
        stroke(57, 55, 91);
        triangle(gameChar_x - gameChar.width/2, 
            gameChar_y - gameChar.height, 
            gameChar_x + gameChar.width/2, 
            gameChar_y - gameChar.height, 
            gameChar_x, 
            gameChar_y - 1.25*gameChar.height);
        noStroke();

        // left fin
        fill(116, 92, 151);
        stroke(57, 55, 91);
        triangle(gameChar_x - gameChar.width/2, 
            gameChar_y - 0.6*gameChar.height, 
            gameChar_x - 0.8*gameChar.width, 
            gameChar_y - 0.6*gameChar.height, 
            gameChar_x - 0.8*gameChar.width, 
            gameChar_y - 0.8*gameChar.height);
        noStroke();

        // right fin
        fill(116, 92, 151);
        stroke(57, 55, 91);
        triangle(gameChar_x + gameChar.width/2, 
            gameChar_y - 0.6*gameChar.height, 
            gameChar_x + 0.8*gameChar.width, 
            gameChar_y - 0.6*gameChar.height, 
            gameChar_x + 0.8*gameChar.width, 
            gameChar_y - 0.8*gameChar.height);
        noStroke();

        // skateboard
        stroke(57, 55, 91);
        fill(116, 92, 151);
        triangle(gameChar_x - gameChar.width/2, 
            gameChar_y, 
            gameChar_x + gameChar.width/2, 
            gameChar_y, 
            gameChar_x, 
            gameChar_y - 0.1*gameChar.height);

    }
}



// ---------------------------
// Background render functions
// ---------------------------

// Function to draw cloud objects

function drawClouds() {
    // Draw clouds.

    for (i = 0; i < clouds.length; i++) {
        noStroke();
        fill(111);
        ellipse(clouds[i].x_pos + 4,
            clouds[i].height + 13,
            (75),
            (20));
        ellipse(clouds[i].x_pos + 10,
            clouds[i].height - 3,
            40,
            40);
        ellipse(clouds[i].x_pos + 30,
            clouds[i].height + 5,
            29,
            30);
        ellipse(clouds[i].x_pos - 10,
            clouds[i].height + 2,
            30,
            30);
        ellipse(clouds[i].x_pos - 25,
            clouds[i].height + 7,
            25,
            25);
        clouds[i].x_pos -= 0.05;
        clouds[i].height += clouds[i].height * random(-0.002, 0.002);

    }

}

// Function to draw mountains objects

function drawMountains() {
    // Draw mountains.

    for (i = 0; i < mountains.length; i++) {
        fill(210, 210, 149);
        triangle(mountains[i].x_pos + 20,
            floorPos_y,
            mountains[i].x_pos + 20 + (mountains[i].width / 3),
            floorPos_y - mountains[i].height + 40, mountains[i].x_pos + 20 + mountains[i].width, floorPos_y);
        fill(234, 216, 113);
        triangle(mountains[i].x_pos - 10,
            floorPos_y,
            mountains[i].x_pos - 10 + (mountains[i].width / 3),
            floorPos_y - mountains[i].height, mountains[i].x_pos - 10 + mountains[i].width, floorPos_y);

    }
}
// Function to draw trees objects

function drawTrees() {
    // Draw trees.

    for (i = 0; i < trees_x.length; i++) {
        noStroke();
        //shoot
        fill(155, 16, 113);
        rect(trees_x[i].pos,
            floorPos_y - trees_x[i].height,
            8,
            trees_x[i].height);
        //leaves
        fill(58, 91, 32);
        triangle(trees_x[i].pos - 16,
            floorPos_y - trees_x[i].height,
            trees_x[i].pos + 24,
            floorPos_y - trees_x[i].height,
            trees_x[i].pos + 4,
            floorPos_y - 2 * trees_x[i].height);
        fill(78, 121, 42);
        triangle(trees_x[i].pos - 14,
            floorPos_y - 1.4 * trees_x[i].height,
            trees_x[i].pos + 22,
            floorPos_y + - 1.4 * trees_x[i].height,
            trees_x[i].pos + 4,
            floorPos_y + - 2.4 * trees_x[i].height);
        fill(97, 151, 53);
        triangle(trees_x[i].pos - 10,
            floorPos_y - 1.8 * trees_x[i].height,
            trees_x[i].pos + 18,
            floorPos_y - 1.8 * trees_x[i].height,
            trees_x[i].pos + 4,
            floorPos_y - 2.6 * trees_x[i].height);

    }
}


// ---------------------------------
// Canyon render and check functions
// ---------------------------------

// Function to draw canyon objects

function drawCanyon(t_canyon) {

    //canyons
    
    //lava
   
    push();
    fill(200, 50, 0);
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = '#cc3300'
    

    rect(t_canyon.x_pos,
        t_canyon.y_pos,
        t_canyon.width,
        .7 * (displayHeight - floorPos_y));


    
       pop(); 
    drawCanyonLava(t_canyon.x_pos + (.2* t_canyon.width), 
    t_canyon.x_pos + (.4* t_canyon.width),
    t_canyon.x_pos + (.6* t_canyon.width),
    t_canyon.x_pos + (.8* t_canyon.width)
    );
    
        
}

// Function to check whether character is over a canyon

function checkCanyon(t_canyon) {
    if (gameChar_world_x > t_canyon.x_pos + displayWidth/600 && gameChar_world_x < (t_canyon.x_pos + t_canyon.width - displayWidth/600) && gameChar_y >= floorPos_y) {
        isLeft = false;
        isRight = false;
        isPlummeting = true;
    }

}

// ----------------------------------
// Collectable items render and check functions
// ----------------------------------

// Function to draw collectable objects

function drawCollectable(t_collectable) {

    fill(173, 100, 47);
    ellipse(t_collectable.x_pos,
        t_collectable.y_pos,
        t_collectable.size / 4,
        t_collectable.size / 4);
    fill(21, 160, 221);
    ellipse(t_collectable.x_pos,
        t_collectable.y_pos,
        t_collectable.size / 7,
        t_collectable.size / 5);


}

// Function to check character has collected a collectable item and increment score

function checkCollectable(t_collectable) {
    if (dist(gameChar_world_x, (gameChar_y - gameChar.height/2), t_collectable.x_pos, t_collectable.y_pos) < 40) {
        t_collectable.isFound = true;
        game_score += 100;
        pointSound.play();
        return t_collectable.isFound;


    }


}

// Function to draw flagpole

function renderFlagpole() {
    if (!flagpole.isReached) {
        fill(0)
        rect(flagpole.x_pos, 300, 5, floorPos_y - 300)
        fill(130, 130, 130);
        triangle(flagpole.x_pos, floorPos_y - 30, flagpole.x_pos, floorPos_y - 50, flagpole.x_pos - 20, floorPos_y - 30)
    }
    else {
        fill(0)
        rect(flagpole.x_pos, 300, 5, floorPos_y - 300)
        fill("#cc3300")
        triangle(flagpole.x_pos + 5, 300, flagpole.x_pos + 5, 320, flagpole.x_pos + 25, 300)
        noLoop()
    }
}

// Function to check if character has reached flagpole

function checkFlagpole() 
{
    if (abs(gameChar_world_x - flagpole.x_pos) < 10) {
        flagpole.isReached = true;
        game_score += 500;
        enemyShip.isFriendly = true;
        enemyShip.isInRange = false;
        
     }
}

// Function to check if character has fallen down a canyon or score has fallen below zero

function checkPlayerDie() 
{
    if (gameChar_y > floorPos_y + (displayHeight - floorPos_y)*3/4 || game_score < 1)
     {
        dieSound.play();
        lives = max(lives - 1, 0);
        if (lives > 0) 
        {
            
            startGame();
           
        }
        else
        {
            lives = lives
            playerDead = true
            dieSound.stop();
        }
        return true;
    }

}

// Function to draw lives counter

function drawLives() 
{
    for (let i = 0; i <= lives - 1; i++) {
        push();
        strokeWeight(4);
        fill("#cc3300")
        stroke("#cc3300");
        rect(displayWidth/98 + (40 * i), displayHeight/3.5, displayWidth/100, displayHeight/80, displayWidth/400  );
        pop();
    }
}

// Factory Pattern to draw Platforms

function createPlatform(x, y, len) 
{
    var p = {
        x: x,
        y: y,
        length: len,

        // draw the platforms
        draw: function () {
            drawingContext.shadowOffsetX = 5;
            drawingContext.shadowOffsetY = 5;
            drawingContext.shadowBlur = 5;
            drawingContext.shadowColor = '#cc3300'

            fill(255);
            rect(this.x, this.y, this.length, 10);

        },
        // check whether character is on a platform
        checkContact: function (gc_x, gc_y) 
        {
            if ((gc_x) > (this.x - displayWidth/240) &&
                (gc_x) < (this.x + this.length + displayWidth/240)
            ) 
            {
                let d = gc_y - this.y;
                if (d < displayHeight/32 && d >= 0) 
                { 
                    return true;
                }
            }

            return false;
        }
    }
    return p;
}


// Function controlling movement of the enemy ship

function moveShip()
{   
    if(enemyShip.posX > gameChar_world_x + displayWidth/20)
    {
        enemyShip.vx = - 3;
    }
    else if (enemyShip.posX < gameChar_world_x - displayWidth/10)
    {
        enemyShip.vx = 7
    }

    enemyShip.vy += random(-0.04,0.0405);
    
    enemyShip.posX += enemyShip.vx;
    enemyShip.posY = constrain(enemyShip.posY + enemyShip.vy, .25 * displayHeight, .4 * displayHeight);

    // Stop the enemy ship if character has reached flagpole 

    if(enemyShip.isFriendly)
    {
        enemyShip.vx = 0;
        enemyShip.vy = 0;
    }
    
}

// Function to draw the enemy spaceship

function drawEnemyShip()
{
   push()

   translate(enemyShip.posX, enemyShip.posY)

   if(inRange())
   {
    noStroke();
    gcPhys.x_vel -= displayWidth/3600000;
    fill(200, 50, 0, 100);
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 15;
    drawingContext.shadowBlur = 5;
    drawingContext.shadowColor = '#cc3300'

    // Draw enemy spaceship beam if ship is within range of the character

    triangle(displayWidth/40, displayHeight/100, -displayWidth/40, displayHeight *.75, 3 * displayWidth/40, displayHeight *.75);
    enemyShip.isInRange = true;
    
   }

   else
   {
    enemyShip.isInRange = false;
    }
   
   image(enemyShip.img, 0,0); 
   

   pop();
}

// Function to check if enemy ship is within range of character

function inRange()
{
    return (abs(gameChar_world_x - (enemyShip.posX + displayWidth/60)) < 30)
}


// Constructor function to create lava effect

function lavaGen(x1, x2, x3, x4)
{
    this.x1 = x1;
    this.x2 = x2;
    this.x3 = x3;
    this.x4 = x4;
    this.y = (3.05 * (displayHeight - floorPos_y));
    this.size = 10;
    this.alpha = 200;
    

    this.drawLava = function()
    {
        fill(200, 50, 0, this.alpha);
        ellipse(this.x1, this.y, this.size);
        fill(200, 50, 0, this.alpha)
        ellipse(this.x2, this.y, this.size);
        fill(200, 50, 0, this.alpha)
        ellipse(this.x3, this.y, this.size);
        fill(200, 50, 0, this.alpha)
        ellipse(this.x4, this.y, this.size);


    }

    this.updatePosition = function()
    {
        this.x1 += random(-2, 2);
        this.x2 += random(-5, 5);
        this.x3 += random(-5, 5);
        this.x4 += random(-2, 2);
        this.y -= random(0.3,0.5);
        this.alpha -= random(-2, 6);
        this.size -= random(0.2,0.3);
    }

    this.oldLava = function()
    {
        return this.alpha < 25;
    }
}

// Function to draw lava

function drawCanyonLava(x1,x2,x3,x4)
{

    let l = new lavaGen(x1,x2,x3,x4);
    lavaDots.push(l);

    for(let i = 0; i < lavaDots.length/2; i++)
    {
        lavaDots[i].drawLava();
        lavaDots[i].updatePosition();

        if(lavaDots[i].oldLava())
        {
            lavaDots.splice(i, 5);
        }
    }
    
}
// Function to decelerate

function decelerate()
{
    gcPhys.x_vel = displayWidth/720;
}
// Function to render in-game text

function renderText()
{
    fill(0);
    noStroke();
    textFont('Verdana');
    textSize(20);
    fill(200, 50, 0);
    text("Score: " + game_score, displayWidth/98, displayHeight/3.75);


    if (lives < 1) 
    {
        playerDead = true;

        text("Game Over! Ctrl/Cmd + R to continue.", width / 2.5, height / 3);
    }
    else if (flagpole.isReached && lives > 0) 
    {
        text("You win!!! Ctrl/Cmd + R to play again!", width / 2.5, height / 3)
    }

    if(gamePause && !flagpole.isReached && lives > 0)
    {
        text("Use Left and Right keys to move. Spacebar to Jump.\nBeware of the enemy ship! It will try to pin you down \nand reduce your score.\nIf your score falls below 0, you lose a life!\nClick to Start/Pause!", displayWidth/3, displayHeight/3.75)
    }

}

// Function to set initial state of the game

function startGame() {


    bgColor = "#add9e6";
    groundColor = "#218321"
    gameChar_x = displayWidth/10;;
    gameChar_y = floorPos_y;
    
    playerDead = false;

    game_score = 50;


    flagpole =
    {
        x_pos: 3700,
        isReached: false
    };

    // Game character object

    gameChar = 
    {
        height: displayHeight/20,
        width: displayWidth/70,
        sideWidth: displayWidth/80,
        eyeDiameter: displayWidth/200
         
    }


    gcPhys =
    {
        x_vel: displayWidth/720,
        x_acceleration: displayWidth/72000,
        gravity: displayHeight/256, 
        jumpRange: displayHeight/8 
 
    }

    // Creating enemy ship

    enemyShip = 
    {
        posX: 1500,
        posY: displayHeight/3,
        img: enemyShipImg,
        vx: -3,
        vy: 0,
        isInRange: false,
        isFriendly: false
    
    }

    
    // Array for holding lava dot elements

    lavaDots = [];


    // Variable to control the background scrolling.
    scrollPos = 0;

    // Variable to store the real position of the gameChar in the game
    // world. Needed for collision detection.
    gameChar_world_x = gameChar_x - scrollPos;

    // Boolean variables to control the movement of the game character.
    isLeft = false;
    isRight = false;
    isFalling = false;
    isPlummeting = false;


    // Initialise arrays of scenery objects.
    clouds =
        [
            { x_pos: 600, height: floorPos_y - 320 },
            { x_pos: 800, height: floorPos_y - 320 },
            { x_pos: 2300, height: floorPos_y - 320 },
            { x_pos: 2500, height: floorPos_y - 320 },
            { x_pos: 3100, height: floorPos_y - 320 },
            { x_pos: 1400, height: floorPos_y - 320 },
            { x_pos: 1820, height: floorPos_y - 320 },
            { x_pos: 2120, height: floorPos_y - 320 },
            { x_pos: 2730, height: floorPos_y - 320 },
            { x_pos: 2815, height: floorPos_y - 320 },
            { x_pos: 3400, height: floorPos_y - 320 },
            { x_pos: 3600, height: floorPos_y - 320 }

        ];
    mountains =
        [
            { x_pos: 200, width: 70, height: 240 },
            { x_pos: 600, width: 60, height: 240 },
            { x_pos: 800, width: 70, height: 220 },
            { x_pos: 1000, width: 50, height: 240 },

            { x_pos: 1800, width: 70, height: 240 },
            { x_pos: 2200, width: 70, height: 240 },
            { x_pos: 2500, width: 60, height: 220 },

            { x_pos: 3400, width: 80, height: 260 }
        ];

    trees_x =
        [
            { pos: 100, height:40 },
            { pos: 300, height:50 },
            { pos: 700, height:60 },
            { pos: 900, height:70 },
            { pos: 1100, height:40 },
            { pos: 1300, height:50 },
            { pos: 1700, height:60 },
            { pos: 1900, height:60 },
            { pos: 2100, height:70 },
            { pos: 2300, height:80 },
            { pos: 2500, height:40 },
            { pos: 2900, height:50 }
        ];

    canyons =
        [
            { x_pos: 1130, width: 60, y_pos: floorPos_y },
            { x_pos: 1430, width: 80, y_pos: floorPos_y },
            { x_pos: 1930, width: 60, y_pos: floorPos_y },
            { x_pos: 2430, width: 60, y_pos: floorPos_y },
            { x_pos: 2630, width: 160, y_pos: floorPos_y },
            { x_pos: 2980, width: 100, y_pos: floorPos_y },
        ];

    collectables =
        [
            { x_pos: 350, y_pos: floorPos_y - 40, size: 100, isFound: false },
            { x_pos: 520, y_pos: floorPos_y - 120, size: 100, isFound: false },
            { x_pos: 690, y_pos: floorPos_y - 40, size: 100, isFound: false },
            { x_pos: 1270, y_pos: floorPos_y - 120, size: 100, isFound: false },
            { x_pos: 1360, y_pos: floorPos_y - 40, size: 100, isFound: false },
            { x_pos: 1620, y_pos: floorPos_y - 120, size: 100, isFound: false },
            { x_pos: 1820, y_pos: floorPos_y - 120, size: 100, isFound: false },
            { x_pos: 2020, y_pos: floorPos_y - 120, size: 100, isFound: false },
            { x_pos: 2215, y_pos: floorPos_y - 120, size: 100, isFound: false },
            { x_pos: 2650, y_pos: floorPos_y - 220, size: 100, isFound: false },
            { x_pos: 2730, y_pos: floorPos_y - 220, size: 100, isFound: false },
            { x_pos: 2815, y_pos: floorPos_y - 180, size: 100, isFound: false },
            { x_pos: 2950, y_pos: floorPos_y - 120, size: 100, isFound: false },
            { x_pos: 3400, y_pos: floorPos_y - 80, size: 100, isFound: false },
            { x_pos: 3500, y_pos: floorPos_y - 100, size: 100, isFound: false },
            { x_pos: 3600, y_pos: floorPos_y - 120, size: 100, isFound: false },


        ];

    platforms = [];
    platforms.push(createPlatform(400, floorPos_y*7/8, 40));
    platforms.push(createPlatform(500, floorPos_y*7/8, 40));
    platforms.push(createPlatform(600, floorPos_y*7/8, 40));
    platforms.push(createPlatform(1250, floorPos_y*7/8, 40));
    platforms.push(createPlatform(1600, floorPos_y*7/8, 40));
    platforms.push(createPlatform(1700, floorPos_y*7/8, 40));
    platforms.push(createPlatform(1800, floorPos_y*7/8, 40));
    platforms.push(createPlatform(2000, floorPos_y*7/8, 40));
    platforms.push(createPlatform(2100, floorPos_y*7/8, 40));
    platforms.push(createPlatform(2200, floorPos_y*7/8, 30));
    platforms.push(createPlatform(2300, floorPos_y*7/8, 30));
    platforms.push(createPlatform(2620, floorPos_y*7/8, 30));
    platforms.push(createPlatform(2730, floorPos_y*7/8, 30));
    platforms.push(createPlatform(2850, floorPos_y*7/8, 30));



}
