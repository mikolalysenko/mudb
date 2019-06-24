import * as React from 'react';
import * as ReactDOM from 'react-dom';

export type PuzzleDetail = {
    color:string;
    rotation:number;
    position:{
        x:number;
        y:number;
    }
};
type PuzzleList = PuzzleDetail[];

export class ExampleUi {
    public react_el:HTMLElement;
    private undo:() => void;
    private redo:() => void;
    private setX:(idx:number, x:number) => void;
    private setY:(idx:number, x:number) => void;
    private setColor:(idx:number, color:string) => void;
    private setRotation:(idx:number, rotation:number) => void;
    private deletePuzzle:(idx:number) => void;
    private createPuzzle:(puzzle:PuzzleDetail) => void;
    constructor(spec:PuzzleExampleProps) {
        this.react_el = document.createElement('div');
        this.react_el.id = 'main';
        document.body.appendChild(this.react_el);

        this.undo = spec.undo;
        this.redo = spec.redo;
        this.setX = spec.setX;
        this.setY = spec.setY;
        this.setColor = spec.setColor;
        this.setRotation = spec.setRotation;
        this.deletePuzzle = spec.deletePuzzle;
        this.createPuzzle = spec.createPuzzle;

        this.renderDom(spec.puzzleList);
    }

    public renderDom(state:PuzzleList) {
        ReactDOM.render(
            <PuzzleExample
                puzzleList={state}
                undo={this.undo}
                redo={this.redo}
                setX={this.setX}
                setY={this.setY}
                setColor={this.setColor}
                setRotation={this.setRotation}
                deletePuzzle={this.deletePuzzle}
                createPuzzle={this.createPuzzle}
            />,
            this.react_el,
        );
    }
}

type PuzzleExampleProps = {
    puzzleList:PuzzleList;
    setX:(idx:number, x:number) => void
    setY:(idx:number, y:number) => void
    setColor:(idx:number, color:string) => void
    setRotation:(idx:number, rotation:number) => void
    undo:() => void;
    redo:() => void;
    deletePuzzle:(idx:number) => void;
    createPuzzle:(puzzle:PuzzleDetail) => void;
};

type PuzzleExampleState = {
    selectedPuzzle:number;
    draggingPuzzle:PuzzleDetail|undefined;
};

export class PuzzleExample extends React.Component<PuzzleExampleProps, PuzzleExampleState> {
    constructor(props) {
        super(props);
        this.state = {
            selectedPuzzle: -1,
            draggingPuzzle: undefined,
        };
        this.injectCss();
        document.addEventListener('dragover', this._dragging.bind(this));
        this.ref = React.createRef();
    }

    public ref:React.RefObject<HTMLDivElement>;

    private injectCss() {
        const css = `
            html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
            }

            body {
                box-sizing: border-box;
                padding: 20px;
            }

            #main {
                width: 100%;
                height: 100%;
            }

            .puzzleExample{
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
            }

            .exampleTitle {
                margin: 0 20px;
                font-size: 36px;
                font-weight: bold;
            }

            .operationBtnList {
                display: flex;
                justify-content: flex-start;
                margin: 10px;
            }

            .operationBtn {
                width: 150px;
                height: 30px;
                background: #ddd;
                border: 1px solid #ccc;
                border-radius: 3px;
                margin-right: 50px;
                outline: none;
                cursor: pointer;
            }

            .operationBtn:hover {
                background: #eee
            }

            .operationBtn:active {
                background: #ccc;
            }

            .exampleContent {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: row;
            }

            .puzzleList {
                padding: 10px;
                width: 240px;
                background: #eee;
                user-select: none;
            }

            .puzzleName {
                -webkit-user-drag: element;
                display: flex;
                position: relative;
            }

            .removePuzzle {
                color: yellow;
                width: 30px;
                height: 30px;
                background: red;
                position: absolute;
                right: 0;
                text-align: center;
            }

            .createPuzzle, .puzzleName {
                height: 30px;
                padding: 0 20px;
                border: 1px solid #ccc;
                margin-bottom: 3px;
                line-height: 30px;
                cursor: pointer;
                background: #ddd;
            }

            .puzzleName:hover {
                background: #eee;
            }

            .puzzleName:active {
                background: #ccc;
            }

            .puzzleName.selected {
                background: #fff;
            }

            .puzzleDetailContainer {
                padding: 20px;
                margin-left: 20px;
                border: 1px solid #eee;
                border-radius: 3px;
            }

            .puzzleValue {
                margin-left: 20px;
            }
        `;

        const style = document.createElement('style');
        style.innerHTML = css;
        document.head.append(style);
    }

    public setX(x:number) {
        if (this.state.selectedPuzzle < 0) { return; }
        this.props.setX(this.state.selectedPuzzle, x);
    }

    public setY(y:number) {
        if (this.state.selectedPuzzle < 0) { return; }
        this.props.setY(this.state.selectedPuzzle, y);
    }

    public setColor(color:string) {
        if (this.state.selectedPuzzle < 0) { return; }
        this.props.setColor(this.state.selectedPuzzle, color);
    }

    public setRotation(rotation:number) {
        if (this.state.selectedPuzzle < 0) { return; }
        this.props.setRotation(this.state.selectedPuzzle, rotation);
    }

    private _selectPuzzle(idx:number) {
        this.setState({
            selectedPuzzle: idx,
        });
    }

    private _createPuzzle() {
        this.props.createPuzzle({
            color: 'new puzzle',
            rotation: 55,
            position: {
                x: 123,
                y: 321,
            },
        });
    }

    private _dragStart(item:PuzzleDetail, idx:number) {
        this.setState({
            draggingPuzzle: item,
        });
    }

    private _dragging(e:MouseEvent) {
        if (!this.state.draggingPuzzle) { return; }
    }

    private _drop(e:React.DragEvent) {
        this.setState({
            draggingPuzzle: undefined,
        });
    }

    public render() {
        const selectedPuzzle = this.props.puzzleList[this.state.selectedPuzzle];
        return(
            <div className='puzzleExample'>
                <h1 className='exampleTitle'>Puzzle List</h1>
                <div className='operationBtnList'>
                    <button className='operationBtn' onClick={() => this.props.undo()}>undo</button>
                    <button className='operationBtn' onClick={() => this.props.redo()}>redo</button>
                </div>
                <div className='exampleContent'>
                    <div className='puzzleList'
                        ref={this.ref}
                        onDrop={(e) => this._drop(e)}
                    >
                        {
                            this.props.puzzleList.map((item, idx) => {
                                return (
                                    <div
                                        onDragStart={() => this._dragStart(item, idx)}
                                        onDragEnd={(e) => {
                                            this._drop(e);
                                        }}
                                        className={idx === this.state.selectedPuzzle ? 'puzzleName selected' : 'puzzleName'}
                                        onClick={() => this._selectPuzzle(idx)}
                                        key={idx}>
                                            {item.color}
                                        <div
                                            onClick={() => this.props.deletePuzzle(idx)}
                                            className='removePuzzle'>x</div>
                                    </div>
                                );
                            })
                        }

                        <div
                            className={'createPuzzle'}
                            style={{textAlign:'center'}}
                            onClick={() => this._createPuzzle()}>
                                +
                        </div>
                    </div>

                    <div className='puzzleDetail'>
                        {
                            selectedPuzzle
                            ? this.renderDetail(selectedPuzzle)
                            : null
                        }
                    </div>
                </div>
            </div>
        );
    }

    public renderDetail(detail:PuzzleDetail) {
        return(
            <div className='puzzleDetailContainer'>
                <div>
                    <div>color:</div>
                    <input
                        value={detail.color}
                        onChange={(e) => this.setColor(e.target.value)}
                    ></input>
                </div>
                <div>
                    <div>rotation:</div>
                    <input
                        type='number'
                        value={detail.rotation.toString()}
                        onChange={(e) => this.setRotation(+e.target.value)}
                    ></input>
                </div>

                <div>
                    <div>position:</div>
                    <div>
                        <div className='puzzleValue'>
                            <span>x: </span>
                            <input
                                type='number'
                                value={detail.position.x.toString()}
                                onChange={(e) => this.setX(+e.target.value)}
                            ></input>
                        </div>
                        <div className='puzzleValue'>
                            <span>y: </span>
                            <input
                                type='number'
                                value={detail.position.y.toString()}
                                onChange={(e) => this.setY(+e.target.value)}
                            ></input>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}