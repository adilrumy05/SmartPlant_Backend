// src/pythonWorker.js
const { spawn } = require('child_process');
const path = require('path');

// Python worker, which loads the AI model once and handles all inferences
let pyWorker = null; // Will store the persistent Python process reference

function getWorker() { // Create or return an existing worker process
  if (pyWorker && !pyWorker.killed) return pyWorker; // Reuse existing worker if alive
  
  const pythonPath = process.env.PYTHON_PATH || 'python';
  const workerPath = path.join(__dirname, '..', 'python', 'worker.py');
  
  // Spawn a new python worker process
  pyWorker = spawn(pythonPath, [workerPath], { stdio: ['pipe', 'pipe', 'pipe'] }); 

  // pyWorker.stderr.on('data', (data) => { // Log any errors from the python worker to console
  //   console.error('[pyworker stderr]', data.toString());
  // });

  // pyWorker.on('close', (code) => { // Handle unexpected worker exit
  //   console.error('[pyworker] exited with code', code);
  //   pyWorker  = null; // Set worker to null so it can be recreated
  // });

  // pyWorker.on('error', (err) => { // Handle spawn error (for example if a file is not found)
  //   console.error('[pyworker] Failed to start worker.', err.message);
  //   pyWorker = null;
  // });

  // console.log('[pyworker] started. Path: ' + pythonPath);
  // return pyWorker;
  pyWorker.on('exit', (code, signal) => {
    console.error(`[pyworker] exited with code=${code}, signal=${signal}`);
    pyWorker = null;
  });

  pyWorker.stderr.on('data', (data) => {
    console.error('[pyworker] stderr:', data.toString());
  });

  return pyWorker;
}

// Send an inference request to the worker and wait for response
function inferWithWorker(imagePath, topk = 5) {
  return new Promise((resolve, reject) => {
    const worker = getWorker(); // Ensure we have a worker process
    let buf = ''; // Buffer to accumulate stdout data

    // Listen for worker output
    const onData = (d) => {
      buf += d.toString();
      const nl = buf.indexOf('\n'); // Python worker sends one line per result
      if (nl !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        worker.stdout.off('data', onData);

        try {
          const json = JSON.parse(line); // Parse the JSON result
          if (json.error) return reject(new Error(json.error));
          resolve(json);
        } catch (e) {
          reject(e);
        }
      }
    };

    // Attach listener and send JSON request
    worker.stdout.on('data', onData);
    worker.stdin.write(JSON.stringify({ image: imagePath, topk }) + '\n');
  });
}

module.exports = { getWorker, inferWithWorker };
