import { GameSchema } from './schema';
import { MuClient } from 'mudb/client';
import { MuClientState } from '../../client';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  initFields,
  initCanvas,
  onKeyDown,
  welcomeScreen,
} from './pac';

export = function(client:MuClient) {
  const canvas = document.createElement('canvas');
  canvas.style.padding = '0px';
  canvas.style.margin = '0px';
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.innerText = 'canvas not supported';
    return;
  }

  const protocol = new MuClientState({
    schema: GameSchema,
    client,
  });

  protocol.configure({
    ready: () => {
      initFields();
      initCanvas(CANVAS_WIDTH, CANVAS_HEIGHT, ctx);
      canvas.addEventListener('keydown', onKeyDown, false);
      canvas.setAttribute('tabindex', '0');
      canvas.focus();
      welcomeScreen();
    },
  });

  client.start();
};
