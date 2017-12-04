import { MuClient } from 'mudb/client';
import { MuClockClient } from '../../client';

export = function(client:MuClient) {
  document.body.innerHTML =
  `
  <style>
    #connect, #disconnect {
      width: 100px;
      height: 40px;
      background: lightblue;
      text-align: center;
      line-height: 40px;
      margin: 5px;
      pointer: cursor;
    }
  </style>
  <div>
  <canvas id="canvas" width="400" height="400" style="background-color:#333"></canvas>
  <div id='tick-number'></div>
  <div id=connect>start</div>
  <div id=disconnect>stop</div>
  </div>
  `;
  const canvas = <HTMLCanvasElement>document.getElementById('canvas');
  const start_btn = <HTMLButtonElement>document.getElementById('connect');
  const stop_btn = <HTMLButtonElement>document.getElementById('disconnect');
  const tick_num = document.getElementById('tick-number');
  if (!canvas || ! tick_num) {
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  let _last_tick = 0;

  var radius = canvas.height / 2;
  ctx.translate(radius, radius);
  radius = radius * 0.90;

  function drawClock(tick) {
    drawFace(ctx, radius);
    drawNumbers(ctx, radius);
    drawTime(ctx, radius, tick);
  }

  const clock = new MuClockClient({
    client: client,
    tick: (t) => {
      _last_tick = Math.round(t * 100) / 100;
      console.log(t);
      if (is_close) {
        return;
      }
      drawClock(_last_tick);
      tick_num.innerHTML = `tick ${Math.round(clock.tick() * 100) / 100}<br/> ping ${clock.ping()}`;
    },
  });

  let is_close = false;

  const config = {
    ready: () => {
        console.log('client ready');
        function render() {
          if (is_close) {
            return;
          }
          const _tick = Math.round(clock.tick() * 100) / 100;
          _last_tick = _tick;
        }
        render();
    },
    close: () => {
      console.log('CLOSE');
      is_close = true;
    },
  };
  client.start(config);
  start_btn.addEventListener('click', () => {
    // client.restart(config);
  });
  stop_btn.addEventListener('click', () => {
    client.destroy();
  });
};

function drawFace(ctx, radius) {
  var grad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();

  grad = ctx.createRadialGradient(0, 0 , radius * 0.95, 0, 0, radius * 1.05);
  grad.addColorStop(0, '#333');
  grad.addColorStop(0.5, 'white');
  grad.addColorStop(1, '#333');
  ctx.strokeStyle = grad;
  ctx.lineWidth = radius * 0.1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.1, 0, 2 * Math.PI);
  ctx.fillStyle = '#333';
  ctx.fill();
}

function drawTime(ctx, radius, tick) {
  var hour = tick / 3600;
  var minute = tick / 60;
  var second = tick;
  //hour
  hour = hour % 12;
  hour = (hour * Math.PI / 6) + (minute * Math.PI / (6 * 60)) + (second * Math.PI / (360 * 60));
  drawHand(ctx, hour, radius * 0.5, radius * 0.07);
  //minute
  minute = (minute * Math.PI / 30) + (second * Math.PI / (30 * 60));
  drawHand(ctx, minute, radius * 0.8, radius * 0.07);
  // second
  second = (second * Math.PI / 30);
  drawHand(ctx, second, radius * 0.9, radius * 0.02);
}

function drawHand(ctx, pos, length, width) {
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.moveTo(0, 0);
  ctx.rotate(pos);
  ctx.lineTo(0, -length);
  ctx.stroke();
  ctx.rotate(-pos);
}

function drawNumbers(ctx, radius) {
  let ang;
  let num;
  ctx.font = radius * 0.15 + 'px arial';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  for (num = 1; num < 13; num++) {
    ang = num * Math.PI / 6;
    ctx.rotate(ang);
    ctx.translate(0, -radius * 0.85);
    ctx.rotate(-ang);
    ctx.fillText(num.toString(), 0, 0);
    ctx.rotate(ang);
    ctx.translate(0, radius * 0.85);
    ctx.rotate(-ang);
  }
}
