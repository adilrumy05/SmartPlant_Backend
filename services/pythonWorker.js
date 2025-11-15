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

  pyWorker.on('exit', (code, signal) => {
    console.error(`[pyworker] exited with code=${code}, signal=${signal}`);
    pyWorker = null;
  });

  pyWorker.stderr.on('data', (data) => {
    console.error('[pyworker] stderr:', data.toString());
  });

  return pyWorker;
}

const INFER_TIMEOUT_MS = 120000; 

// Send an inference request to the worker and wait for response
function inferWithWorker(imagePath, topk = 5) {
  return new Promise((resolve, reject) => {
    const worker = getWorker(); // Ensure we have a worker process
    let buf = ''; // Buffer to accumulate stdout data

    const onData = (d) => {
      buf += d.toString();

      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);

        const trimmed = line.trim();
        if (!trimmed) {
          // empty line, ignore
          continue;
        }

        try {
          // only stop listening once we successfully parse JSON
          const json = JSON.parse(trimmed);
          worker.stdout.off('data', onData);
          clearTimeout(timer);

          if (json.error) {
            return reject(new Error(json.error));
          }
          return resolve(json);
        } catch (e) {
          // not valid JSON, probably a startup log line, ignore it
          console.warn('[pyworker] ignoring non-JSON line from stdout:', trimmed);
          // keep listening for the next line
          continue;
        }
      }
    };

    worker.stdout.on('data', onData);

    const timer = setTimeout(() => {
      worker.stdout.off('data', onData);
      reject(new Error('Inference timed out'));
    }, INFER_TIMEOUT_MS);

    worker.stdin.write(JSON.stringify({ image: imagePath, topk }) + '\n');
  });
}

module.exports = { getWorker, inferWithWorker };