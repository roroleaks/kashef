import { DetectorEngine, DetectionResult } from './types';

const engines = new Map<string, DetectorEngine>();
let defaultEngineId = 'statistical';

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
    // If specific engine missing, fall back to any registered engine
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
 * Main unified entrypoint: analyze(text) -> DetectionResult
 */
export async function analyze(text: string, engineId?: string): Promise<DetectionResult> {
  const detector = getDetector(engineId);
  return detector.analyze(text);
}

export * from './types';
export * from './utils';
