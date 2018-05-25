const express = require('express');

const runTimer = () => {
  const cron = require('cron');
  const spawn = require('child_process').spawn;

  const schedule = process.env.SCHEDULE || '0 * * * *';
  console.log(`Starting scheduler with ${schedule}`);

  const job = new cron.CronJob({
    cronTime: schedule,
    onTick: () => {
      console.log('Capturing');
      const job = spawn('npm', ['run', 'capture'], { stdio: 'inherit' });

      job.on('exit', (code) => {
        console.log('Capturing exited with code ' + code.toString());
      });
    },
    start: true,
  });
};

const runServer = () => {
  const app = express();

  app.set('port', (process.env.PORT || 5000))

  app.get('/', function (request, response) {
    response.send('Sukushokun4')
  });

  app.listen(app.get('port'), function () {
    console.log("Node app is running at localhost:" + app.get('port'))
  })
};

runTimer();
runServer();
