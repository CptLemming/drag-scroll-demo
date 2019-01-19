import React, { Component } from 'react';
import { of, combineLatest, interval, fromEvent } from 'rxjs';
import { map, switchMap, throttleTime, takeUntil } from 'rxjs/operators';
import './App.css';

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

class App extends Component {
  mouseMoveStream;
  mouseDownStream;
  mouseUpStream;
  boundsStream;

  componentDidMount () {
    this.mouseMoveStream = fromEvent(content.current, 'mousemove');
    this.mouseDownStream = fromEvent(content.current, 'mousedown');
    this.mouseUpStream = fromEvent(content.current, 'mouseup');
    this.boundsStream = of(content.current.getBoundingClientRect());

    this.mouseDownStream
      .pipe(switchMap(() => combineLatest(
          this.boundsStream,
          this.mouseMoveStream.pipe(throttleTime(200)),
          interval(50).pipe(map(x => x < 5 ? x + 1 : 5)),
          (bounds, event, speed) => ({
            bounds,
            speed,
            clientX: event.clientX,
            clientY: event.clientY,
          })
        )
          .pipe(takeUntil(this.mouseUpStream))
          .pipe(map(val => {
            const x = val.clientX - val.bounds.left;
            const y = val.clientY - val.bounds.top;
    
            let nextScrollLeft = 0;
            let nextScrollTop = 0;
            const xSpeed = val.speed;
            const ySpeed = val.speed;
            const move = 25;
            const border = 50;

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
        // .pipe(bufferTime(200))
        // .pipe(filter(values => values.length > 0))
        // .pipe(map(values => values[values.length - 1]))
        .subscribe(next => {
          const currentScrollTop = content.current.scrollTop;
          const currentScrollLeft = content.current.scrollLeft;
          const nextScrollTop = currentScrollTop + next.top;
          const nextScrollLeft = currentScrollLeft + next.left;

          if (nextScrollTop !== currentScrollTop || nextScrollLeft !== currentScrollLeft) {
            content.current.scrollTo(nextScrollLeft, nextScrollTop);
          }
        });
  }

  render() {
    return (
      <div className="app">
        <div className="perimiter">
        <div className="container">
          <div className="content" ref={content}>
            <div className="perimiter__inner" />
              {data.map((row, rowIndex) => (
                <div key={rowIndex} className="row">
                  {row.map(cell => (
                    <div key={`${cell.x}:${cell.y}`} className="cell">
                      {`${cell.x}-${cell.y}`}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
