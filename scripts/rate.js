// Rate a task:  node scripts/rate.js <taskId> useful
//          or:  node scripts/rate.js <taskId> summary=useless wallet-risk=useful
import { rateTask } from "@mandate/agent";

const [taskId, ...args] = process.argv.slice(2);
const ratings = Object.fromEntries(args.map((a) => (a.includes("=") ? a.split("=") : ["default", a])));
const r = await rateTask(taskId, ratings);
console.log(r.ratings);
