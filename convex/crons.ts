import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Регистрируем CRON задачи
const crons = cronJobs();

// Обновление ресурсов каждые 5 минут
crons.interval(
  "update-resources", 
  { minutes: 5 }, 
  internal.resourceUpdater.updateAllUsersResources
);

// Обработка бустеров каждые 15 минут
crons.interval(
  "process-boosters", 
  { minutes: 15 }, 
  internal.boosterProcessor.processExpiredBoosters
);

export default crons; 