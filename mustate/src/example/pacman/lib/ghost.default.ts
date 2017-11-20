//////////////////////////////////////////////////////
// Group members: Zi Wang (ziw), Bingying Xia(bxia) //
//////////////////////////////////////////////////////

export function Ghost(xCord, yCord, gColor, direction) {
    this.x = xCord;
    this.y = yCord;
    this.color = gColor;
    this.dir = direction;
    this.isWeak = false;
    this.radius = GHOST_RADIUS;
    this.isMoving = false;
    this.isBlinking = false;
    this.isDead = false;
    this.speed = speed;
    this.stepCounter = 0;

}

//send this ghost back to ghost house.
//location in ghost house is determined by its color
Ghost.prototype.toGhostHouse = function() {
    let initX;
    let initY;
    switch (this.color) {
            case ORANGE:
            initX = ghostHouse[0][1] * GRID_WIDTH + GRID_WIDTH / 2;
            initY = ghostHouse[0][0] * GRID_WIDTH + GRID_WIDTH / 2;
            break;

            case CYAN:
            initX =  ghostHouse[1][1] * GRID_WIDTH + GRID_WIDTH / 2;
            initY =  ghostHouse[1][0] * GRID_WIDTH + GRID_WIDTH / 2;
            break;

            case PINK:
            initX = ghostHouse[2][1] * GRID_WIDTH + GRID_WIDTH / 2;
            initY = ghostHouse[2][0] * GRID_WIDTH + GRID_WIDTH / 2;
            break;

            case RED:
            initX = ghostHouse[3][1] * GRID_WIDTH + GRID_WIDTH / 2;
            initY = ghostHouse[3][0] * GRID_WIDTH + GRID_WIDTH / 2;
            break;

        }
    this.x = initX;
    this.y = initY;
    this.dir = DOWN;
    this.stepCounter = 0;
};

Ghost.prototype.draw = function() {

    if (!this.isDead) {
        // body color
        if (this.isWeak) {
            if (this.isBlinking) {
                ctx.fillStyle = BLINKING_COLOR;
            } else {
                ctx.fillStyle = WEAK_COLOR;
            }
        } else {
            ctx.fillStyle = this.color;
        }

        ctx.beginPath();

        ctx.arc(this.x, this.y, this.radius, Math.PI, 0, false);
        ctx.moveTo(this.x - this.radius, this.y);

        // LEGS
        if (!this.isMoving) {
            ctx.lineTo(this.x - this.radius, this.y + this.radius);
            ctx.lineTo(this.x - this.radius + this.radius / 3, this.y + this.radius - this.radius / 4);
            ctx.lineTo(this.x - this.radius + this.radius / 3 * 2, this.y + this.radius);
            ctx.lineTo(this.x, this.y + this.radius - this.radius / 4);
            ctx.lineTo(this.x + this.radius / 3, this.y + this.radius);
            ctx.lineTo(this.x + this.radius / 3 * 2, this.y + this.radius - this.radius / 4);

            ctx.lineTo(this.x + this.radius, this.y + this.radius);
            ctx.lineTo(this.x + this.radius, this.y);
        } else {
            ctx.lineTo(this.x - this.radius, this.y + this.radius - this.radius / 4);
            ctx.lineTo(this.x - this.radius + this.radius / 3, this.y + this.radius);
            ctx.lineTo(this.x - this.radius + this.radius / 3 * 2, this.y + this.radius - this.radius / 4);
            ctx.lineTo(this.x, this.y + this.radius);
            ctx.lineTo(this.x + this.radius / 3, this.y + this.radius - this.radius / 4);
            ctx.lineTo(this.x + this.radius / 3 * 2, this.y + this.radius);
            ctx.lineTo(this.x + this.radius, this.y + this.radius - this.radius / 4);
            ctx.lineTo(this.x + this.radius, this.y);
        }

        ctx.fill();
    }

    if (this.isWeak) {

        if (this.isBlinking) {
            ctx.fillStyle = '#f00';
            ctx.strokeStyle = 'f00';
        } else {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'white';
        }

        //eyes
        ctx.beginPath(); //left eye
        ctx.arc(this.x - this.radius / 2.5, this.y - this.radius / 5, this.radius / 5, 0, Math.PI * 2, true); // white
        ctx.fill();

        ctx.beginPath(); // right eye
        ctx.arc(this.x + this.radius / 2.5, this.y - this.radius / 5, this.radius / 5, 0, Math.PI * 2, true); // white
        ctx.fill();

        //mouth
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.moveTo(this.x - this.radius + this.radius / 5, this.y + this.radius / 2);
        ctx.lineTo(this.x - this.radius + this.radius / 3, this.y + this.radius / 4);
        ctx.lineTo(this.x - this.radius + this.radius / 3 * 2, this.y + this.radius / 2);
        ctx.lineTo(this.x, this.y + this.radius / 4);
        ctx.lineTo(this.x + this.radius / 3, this.y + this.radius / 2);
        ctx.lineTo(this.x + this.radius / 3 * 2, this.y + this.radius / 4);
        ctx.lineTo(this.x + this.radius - this.radius / 5, this.y + this.radius / 2);
        ctx.stroke();
    } else {
        // EYES
        ctx.fillStyle = 'white'; //left eye
        ctx.beginPath();
        ctx.arc(this.x - this.radius / 2.5, this.y - this.radius / 5, this.radius / 3, 0, Math.PI * 2, true); // white
        ctx.fill();

        ctx.fillStyle = 'white'; //right eye
        ctx.beginPath();
        ctx.arc(this.x + this.radius / 2.5, this.y - this.radius / 5, this.radius / 3, 0, Math.PI * 2, true); // white
        ctx.fill();

        switch (this.dir) {

            case UP:
                ctx.fillStyle = 'black'; //left eyeball
                ctx.beginPath();
                ctx.arc(this.x - this.radius / 3, this.y - this.radius / 5 - this.radius / 6, this.radius / 6, 0, Math.PI * 2, true); //black
                ctx.fill();

                ctx.fillStyle = 'black'; //right eyeball
                ctx.beginPath();
                ctx.arc(this.x + this.radius / 3, this.y - this.radius / 5 - this.radius / 6, this.radius / 6, 0, Math.PI * 2, true); //black
                ctx.fill();
                break;

            case DOWN:
                ctx.fillStyle = 'black'; //left eyeball
                ctx.beginPath();
                ctx.arc(this.x - this.radius / 3, this.y - this.radius / 5 + this.radius / 6, this.radius / 6, 0, Math.PI * 2, true); //black
                ctx.fill();

                ctx.fillStyle = 'black'; //right eyeball
                ctx.beginPath();
                ctx.arc(this.x + this.radius / 3, this.y - this.radius / 5 + this.radius / 6, this.radius / 6, 0, Math.PI * 2, true); //black
                ctx.fill();
                break;

            case LEFT:
                ctx.fillStyle = 'black'; //left eyeball
                ctx.beginPath();
                ctx.arc(this.x - this.radius / 3 - this.radius / 5, this.y - this.radius / 5, this.radius / 6, 0, Math.PI * 2, true); //black
                ctx.fill();

                ctx.fillStyle = 'black'; //right eyeball
                ctx.beginPath();
                ctx.arc(this.x + this.radius / 3 - this.radius / 15, this.y - this.radius / 5, this.radius / 6, 0, Math.PI * 2, true); //black
                ctx.fill();
                break;

            case RIGHT:
                ctx.fillStyle = 'black'; //left eyeball
                ctx.beginPath();
                ctx.arc(this.x - this.radius / 3 + this.radius / 15, this.y - this.radius / 5, this.radius / 6, 0, Math.PI * 2, true); //black
                ctx.fill();

                ctx.fillStyle = 'black'; //right eyeball
                ctx.beginPath();
                ctx.arc(this.x + this.radius / 3 + this.radius / 5, this.y - this.radius / 5, this.radius / 6, 0, Math.PI * 2, true); //black
                ctx.fill();
                break;

        }

    }

};

Ghost.prototype.getRow = function() {
    return getRowIndex(this.y);
};

Ghost.prototype.getCol = function() {
    return getColIndex(this.x);
};

//move one step in the current direction if allowed
Ghost.prototype.moveOneStep = function() {
    // body...
    var newX =0;
    var newY =0;
    if (!canMove(this.x, this.y, this.dir)) {
        return;
    }
    switch (this.dir) {

        case UP:
        newY = this.y  - this.speed;
        if (newY - this.radius - WALL_WIDTH > 0) {
            this.y = newY;
        }
        break;

        case DOWN:
        newY = this.y + this.speed;
        if (newY + this.radius + WALL_WIDTH < CANVAS_HEIGHT) {
            this.y = newY;

        }
        break;

        case LEFT:
        newX = this.x - this.speed;
        if (newX - this.radius - WALL_WIDTH > 0 ) {
            this.x = newX;
        }
        break;

        case RIGHT:
        newX = this.x + this.speed;

        if (newX + this.radius + WALL_WIDTH < CANVAS_WIDTH) {
            this.x = newX;
        }
        break;

        default:
        break;
    }
};

//make an 180-degree turn
Ghost.prototype.turnBack = function() {
    this.dir = oppositeDir(this.dir);
};

//try to turn(if necessary) and move the ghost
Ghost.prototype.move = function() {

    this.isMoving = !this.isMoving; //so the ghost looks like it's moving
    if (this.isWeak) {
        //if weak, reduce speed and make an immediate turn.
        //Ghost starts making random moves until turning back to normal
        this.speed = speed / 2;
        if (weakCounter === WEAK_DURATION) {
            this.dir = oppositeDir(this.dir);
        }
        if (onGridCenter(this.x, this.y) === false) {
            this.moveOneStep();
        } else {
            var currGrid = maze[getRowIndex(this.y)][getColIndex(this.x)];
            if (currGrid.gridType === LEFT_TOP_RIGHT) {
                this.dir = DOWN;
                this.moveOneStep();
            } else if (currGrid.gridType === TOP_RIGHT_BOTTOM) {
                this.dir = LEFT;
                this.moveOneStep();
            } else if (currGrid.gridType === RIGHT_BOTTOM_LEFT) {
                this.dir = UP;
                this.moveOneStep();
            } else if (currGrid.gridType === BOTTOM_LEFT_TOP) {
                this.dir = RIGHT;
                this.moveOneStep();
            } else {
                this.randomMove();
            }

        }

        this.stepCounter++;
    } else {
        //normal ghost
        if (this.stepCounter != 0 && this.stepCounter % 2 != 0) {
            this.speed = speed / 2;
            this.stepCounter = 0;
        } else {
            this.speed = speed;
        }
        if (onGridCenter(this.x, this.y) === false) {
            this.moveOneStep();
        } else {
            // on grid center
            //first check if dead end
            var currGrid = maze[getRowIndex(this.y)][getColIndex(this.x)];
            if (currGrid.gridType === LEFT_TOP_RIGHT) {
                this.dir = DOWN;
                this.moveOneStep();
            } else if (currGrid.gridType === TOP_RIGHT_BOTTOM) {
                this.dir = LEFT;
                this.moveOneStep();
            } else if (currGrid.gridType === RIGHT_BOTTOM_LEFT) {
                this.dir = UP;
                this.moveOneStep();
            } else if (currGrid.gridType === BOTTOM_LEFT_TOP) {
                this.dir = RIGHT;
                this.moveOneStep();
            } else {
                switch (this.color) {
                    case RED:
                    //blinky
                    this.blinkyMove();
                    break;

                    case CYAN:
                    case ORANGE:
                    //inky
                    this.inkyMove();
                    break;

                    case PINK:
                    //pinky
                    this.pinkyMove();
                    break;
                }
            }
        }
    }

};

//blinky always chooses the tile that will make it closest to pacman
Ghost.prototype.blinkyMove = function() {
    this.moveToPacman(true);
};

//pinky chooses the tile that is 4 steps ahead of pacman
Ghost.prototype.pinkyMove = function() {
    this.moveToPacman(false);
};

//inky is unpredictable, makes random move
Ghost.prototype.inkyMove = function() {
    this.randomMove();
};

Ghost.prototype.moveToPacman = function(targetPacman) {
    var veryLargeDistance = CANVAS_WIDTH * CANVAS_HEIGHT;
    var leftDist, rightDist, upDist, downDist;
    var currDir = this.dir;
    var minDist = veryLargeDistance;
    //get distance if moved to left
    if (currDir === RIGHT || !canMove(this.x, this.y, LEFT)) {
        leftDist = veryLargeDistance;
    } else {
        leftDist = this.getTestDistance(LEFT, targetPacman);
    }

    //get distance to right
    if (currDir === LEFT || !canMove(this.x, this.y, RIGHT)) {
        rightDist = veryLargeDistance;
    } else {
        rightDist = this.getTestDistance(RIGHT, targetPacman);
    }

    //get distance - up
    if (currDir === DOWN || !canMove(this.x, this.y, UP)) {
        upDist = veryLargeDistance;
    } else {
        upDist = this.getTestDistance(UP, targetPacman);
    }

    //get distance - down
    if (currDir === UP || !canMove(this.x, this.y, DOWN)) {
        downDist = veryLargeDistance;
    } else {
        downDist = this.getTestDistance(DOWN, targetPacman);
    }
    this.dir = currDir;
    minDist = Math.min(Math.min(leftDist, rightDist), Math.min(upDist, downDist));
    switch (minDist) {
        case leftDist:
        this.dir = LEFT;
        break;

        case rightDist:
        this.dir = RIGHT;
        break;

        case upDist:
        this.dir = UP;
        break;

        case downDist:
        this.dir = DOWN;
        break;
    }
    this.moveOneStep();
};

//get the distance from this ghost to pacman as if it moved one step in the given direction
Ghost.prototype.getTestDistance = function(dir, targetPacman) {
    var toReturn = 0;
    this.dir = dir;
    this.moveOneStep();
    if (targetPacman) {
        toReturn = Math.sqrt(Math.pow( (this.x - mrPacman.x)  , 2) + Math.pow( this.y - mrPacman.y, 2));
    } else {
        switch (mrPacman.dir) {
            case LEFT:
            toReturn = Math.sqrt(Math.pow( (this.x - (mrPacman.x - 4 * GRID_WIDTH))  , 2) + Math.pow( this.y - mrPacman.y, 2));
            break;

            case RIGHT:
            toReturn = Math.sqrt(Math.pow( (this.x - (mrPacman.x + 4 * GRID_WIDTH))  , 2) + Math.pow( this.y - mrPacman.y, 2));
            break;

            case UP:
            toReturn = Math.sqrt(Math.pow( (this.x - mrPacman.x)  , 2) + Math.pow( this.y - (mrPacman.y - 4 * GRID_HEIGHT), 2));
            break;

            case DOWN:
            toReturn = Math.sqrt(Math.pow( (this.x - mrPacman.x)  , 2) + Math.pow( this.y - (mrPacman.y  + 4 * GRID_HEIGHT), 2));
            break;

            default:
            toReturn = Math.sqrt(Math.pow( (this.x - mrPacman.x)  , 2) + Math.pow( this.y - mrPacman.y, 2));
            break;

        }
    }
    this.turnBack();
    this.moveOneStep();
    return toReturn;
};

//make random move at intersection
Ghost.prototype.randomMove = function() {
    var nextDir =  parseInt(Math.random() * 4) + 1;
    while (true) {
        if ( nextDir != oppositeDir(this.dir)
            && canMove(this.x, this.y, nextDir)) {
            break;
        }
        nextDir =  parseInt(Math.random() * 4) + 1;
    }

    this.dir = nextDir;
    this.moveOneStep();
};
