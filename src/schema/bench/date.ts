import { MuDate } from '../date';
import { deltaByteLength, diffPatchDuration } from './_do';

const date = new MuDate(new Date(0));
deltaByteLength(date, new Date(0), new Date());
diffPatchDuration(date, new Date(0), new Date(), 1e3);
