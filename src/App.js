import React, { Component } from 'react';
import { of, combineLatest, interval, merge, fromEvent } from 'rxjs';
import { map, switchMap, throttleTime, takeUntil } from 'rxjs/operators';
import { Grid } from 'react-virtualized';
import './App.css';
import 'react-virtualized/styles.css';

const data = [];

for (let x = 0; x < 100; x++) {
  const row = [];

  for (let y = 0; y < 100; y++) {
    row.push({
      x,
      y,
    });
  }

  data.push(row);
}

const content = React.createRef();
const grid = React.createRef();

class App extends Component {
  mouseMoveStream;
  mouseDownStream;
  mouseUpStream;
  boundsStream;

  state = {
    isMouseDown: false,
    scrollX: 0,
    scrollY: 0,
    selected: {},
  };

  componentDidMount () {
    this.mouseMoveStream = fromEvent(content.current, 'mousemove');
    this.mouseDownStream = fromEvent(content.current, 'mousedown');
    this.touchStartStream = fromEvent(content.current, 'touchstart');
    this.touchMoveStream = fromEvent(content.current, 'touchmove');
    this.boundsStream = of(content.current.getBoundingClientRect());

    merge(this.mouseDownStream, this.touchStartStream)
      .pipe(switchMap(() => combineLatest(
          this.boundsStream,
          merge(
            this.mouseMoveStream.pipe(throttleTime(200)),
            this.touchMoveStream.pipe(throttleTime(200)).pipe(map(event => ({
              clientX: event.touches[0].clientX,
              clientY: event.touches[0].clientY,
            })))
          ),
          interval(50).pipe(map(x => x < 5 ? x + 1 : 5)),
          (bounds, event, speed) => ({
            bounds,
            speed,
            clientX: event.clientX,
            clientY: event.clientY,
          })
        )
          .pipe(takeUntil(merge(fromEvent(document, 'mouseup'), fromEvent(document, 'touchend'))))
          .pipe(map(val => {
            const x = val.clientX - val.bounds.left;
            const y = val.clientY - val.bounds.top;
    
            let nextScrollLeft = 0;
            let nextScrollTop = 0;
            const xSpeed = val.speed;
            const ySpeed = val.speed;
            const move = 10;
            const border = 100;

            if (x < border) {
              nextScrollLeft = -1 * move * xSpeed;
            } else if (x > (val.bounds.right - border)) {
              nextScrollLeft = move * xSpeed;
            }
            if (y < border) {
              nextScrollTop = -1 * move * ySpeed;
            } else if (y > (val.bounds.bottom - border)) {
              nextScrollTop = move * ySpeed;
            }
    
            return {
              left: nextScrollLeft,
              top: nextScrollTop,
            };
          }))
        ))
        .subscribe(next => {
          // const currentScrollTop = content.current.scrollTop;
          // const currentScrollLeft = content.current.scrollLeft;
          const currentScrollTop = this.state.scrollY;
          const currentScrollLeft = this.state.scrollX;
          const nextScrollTop = currentScrollTop + next.top;
          const nextScrollLeft = currentScrollLeft + next.left;

          if (nextScrollTop !== currentScrollTop || nextScrollLeft !== currentScrollLeft) {
            // content.current.scrollTo(nextScrollLeft, nextScrollTop);
            this.setState({
              scrollX: nextScrollLeft,
              scrollY: nextScrollTop,
            });
          }
        });
  }

  handleSelect = (key) => () => {
    this.setState(({ selected }) => ({
      isMouseDown: true,
      selected: {
        ...selected,
        [key]: !selected[key],
      },
    }));

    document.addEventListener('mouseup', () => {
      this.setState({ isMouseDown: false });
    });
  };

  handleOver = (key) => () => {
    if (this.state.isMouseDown) {
      this.setState(({ selected }) => ({
        selected: {
          ...selected,
          [key]: true,
        },
      }));
    }
  }

  cellRenderer = ({ columnIndex, key, rowIndex, style }) => {
    const cell = data[rowIndex][columnIndex];
    return (
      <div
        key={key}
        style={style}
        className={this.state.selected[key] ? 'selectedCell' : ''}
        onMouseDown={this.handleSelect(key)}
        onMouseOver={this.handleOver(key)}
      >
        {`${cell.x}-${cell.y}`}
      </div>
    )  
  }

  render() {
    return (
      <div className="app">
        <div className="perimiter">
          <div className="container">
            <div className="content" ref={content}>
              {/* <div className="perimiter__inner" />
                {data.map((row, rowIndex) => (
                  <div key={rowIndex} className="row">
                    {row.map(cell => (
                      <div key={`${cell.x}:${cell.y}`} className="cell">
                        {`${cell.x}-${cell.y}`}
                      </div>
                    ))}
                  </div>
                ))}
              </div> */}
              <Grid
                ref={grid}
                cellRenderer={this.cellRenderer}
                columnCount={data[0].length}
                columnWidth={100}
                height={600}
                rowCount={data.length}
                rowHeight={100}
                width={1300}
                scrollLeft={this.state.scrollX}
                scrollTop={this.state.scrollY}
                onScroll={({ scrollTop, scrollLeft }) => this.setState({
                  scrollX: scrollLeft,
                  scrollY: scrollTop,
                })}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
