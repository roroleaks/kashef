import { DetectorEngine, DetectionResult } from './types';
import { engineA } from './engine-a';
import { engineB, isEngineBConfigured } from './engine-b';
import { combineResults } from './combiner';

const engines = new Map<string, DetectorEngine>();
let defaultEngineId = 'engine-a-statistical';

// Register standard built-in engines
engines.set(engineA.id, engineA);
engines.set('statistical', engineA); // Alias
engines.set(engineB.id, engineB);
engines.set('llm', engineB); // Alias

/**
 * Registers an interchangeable detector engine implementation.
 */
export function registerEngine(engine: DetectorEngine): void {
  engines.set(engine.id, engine);
}

/**
 * Sets the default detector engine id.
 */
export function setDefaultEngine(id: string): void {
  if (!engines.has(id)) {
    throw new Error(`Cannot set default engine: Engine with id "${id}" is not registered.`);
  }
  defaultEngineId = id;
}

/**
 * Retrieves a registered detector engine by id, falling back to the default engine.
 */
export function getDetector(engineId?: string): DetectorEngine {
  const targetId = engineId || defaultEngineId;
  const engine = engines.get(targetId);

  if (!engine) {
    const firstAvailable = engines.values().next().value;
    if (firstAvailable) {
      return firstAvailable;
    }
    throw new Error(`NO_DETECTOR_REGISTERED: No detection engine registered for id "${targetId}".`);
  }

  return engine;
}

/**
 * Lists all registered detector engines.
 */
export function listEngines(): { id: string; name: string; description: string }[] {
  return Array.from(engines.values()).map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description,
  }));
}

/**
 * Main unified entrypoint: analyze(text, engineId?) -> DetectionResult
 * When engineId is 'combined' or omitted with Engine B configured, runs both engines
 * and merges their probability ranges via combineResults().
 */
export async function analyze(text: string, engineId?: string): Promise<DetectionResult> {
  if (engineId && engineId !== 'combined' && engineId !== 'all') {
    const detector = getDetector(engineId);
    return detector.analyze(text);
  }

  // If engineId is 'combined'/'all' or if Engine B is configured, run both and combine
  if (engineId === 'combined' || engineId === 'all' || isEngineBConfigured()) {
    const [resultA, resultB] = await Promise.all([
      engineA.analyze(text),
      engineB.analyze(text),
    ]);

    // If Engine B was unconfigured or failed, combineResults gracefully handles it
    return combineResults([resultA, resultB]);
  }

  return engineA.analyze(text);
}

export * from './types';
export * from './utils';
export * from './engine-a';
export * from './engine-b';
export * from './combiner';
export * from './config/thresholds';
