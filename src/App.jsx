import React, { useEffect, useRef, useState } from "react";
import styles from "./App.module.css";

const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 200;
const POPULATION_SIZE = 50;
const MUTATION_RATE = 0.01;
const MAX_TRIANGLES = 50;

// Genera un triángulo aleatorio
const randomTriangle = (colors) => {
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  return {
    points: [
      { x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT },
      { x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT },
      { x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT },
    ],
    color: randomColor,
  };
};

// Crea un individuo (una imagen representada por una serie de triángulos)
const createIndividual = (colors) => ({
  genome: Array.from({ length: MAX_TRIANGLES }, () => randomTriangle(colors)),
});

// Dibuja un individuo en el canvas
const drawIndividual = (ctx, individual) => {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  individual.genome.forEach((triangle) => {
    ctx.beginPath();
    ctx.moveTo(triangle.points[0].x, triangle.points[0].y);
    ctx.lineTo(triangle.points[1].x, triangle.points[1].y);
    ctx.lineTo(triangle.points[2].x, triangle.points[2].y);
    ctx.closePath();
    ctx.fillStyle = triangle.color;
    ctx.fill();
  });
};

// Evalúa la aptitud
const calculateFitness = (ctx, individual, targetCtx) => {
  drawIndividual(ctx, individual);
  const targetData = targetCtx.getImageData(
    0,
    0,
    CANVAS_WIDTH,
    CANVAS_HEIGHT
  ).data;
  const individualData = ctx.getImageData(
    0,
    0,
    CANVAS_WIDTH,
    CANVAS_HEIGHT
  ).data;

  let diff = 0;
  const maxIterations = targetData.length / 4; // Limitar a la cantidad de píxeles
  for (let i = 0; i < maxIterations; i++) {
    diff += Math.abs(targetData[i * 4] - individualData[i * 4]);
    diff += Math.abs(targetData[i * 4 + 1] - individualData[i * 4 + 1]);
    diff += Math.abs(targetData[i * 4 + 2] - individualData[i * 4 + 2]);
  }

  return diff;
};

// Selección del mejor individuo utilizando el método de torneo
const selectParent = (population) => {
  const tournamentSize = 5; // Tamaño del torneo
  const tournament = [];
  for (let i = 0; i < tournamentSize; i++) {
    const randomIndex = Math.floor(Math.random() * population.length);
    tournament.push(population[randomIndex]);
  }
  // Ordenar y devolver el mejor del torneo
  tournament.sort((a, b) => a.fitness - b.fitness);
  return tournament[0];
};

// Mezcla dos genomas
const crossover = (parent1, parent2) => {
  const child = { genome: [] };
  const crossoverPoint = Math.floor(Math.random() * MAX_TRIANGLES);
  for (let i = 0; i < MAX_TRIANGLES; i++) {
    child.genome.push(
      i < crossoverPoint ? parent1.genome[i] : parent2.genome[i]
    );
  }
  return child;
};

// Mutación de un individuo
const mutate = (individual, colors) => {
  individual.genome.forEach((triangle, index) => {
    if (Math.random() < MUTATION_RATE) {
      individual.genome[index] = randomTriangle(colors);
    }
  });
};

export function GeneticAlgorithm({ targetImage }) {
  const canvasRef = useRef(null);
  const targetCanvasRef = useRef(null);
  const [generation, setGeneration] = useState(0);
  const [bestFitness, setBestFitness] = useState(null);
  const [running, setRunning] = useState(true);
  const [colors, setColors] = useState([]);
  const intervalRef = useRef(null); // Usamos useRef para guardar el intervalo

  useEffect(() => {
    if (!targetImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const targetCanvas = targetCanvasRef.current;
    const targetCtx = targetCanvas.getContext("2d");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = targetImage;

    img.onload = () => {
      targetCtx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const colorSamples = [];
      const targetData = targetCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;

      for (let i = 0; i < targetData.length; i += 4) {
        const rgba = `rgba(${targetData[i]}, ${targetData[i + 1]}, ${targetData[i + 2]}, ${targetData[i + 3]})`;
        colorSamples.push(rgba);
      }

      setColors(colorSamples);

      let population = Array.from({ length: POPULATION_SIZE }, () => createIndividual(colorSamples));

      const evolve = () => {
        population.forEach((individual) => {
          individual.fitness = calculateFitness(ctx, individual, targetCtx);
        });

        population.sort((a, b) => a.fitness - b.fitness);
        const bestIndividual = population[0];
        drawIndividual(ctx, bestIndividual);
        setBestFitness(bestIndividual.fitness);

        const newPopulation = [];
        while (newPopulation.length < POPULATION_SIZE) {
          const parent1 = selectParent(population);
          const parent2 = selectParent(population);
          const child = crossover(parent1, parent2);
          mutate(child, colors);
          newPopulation.push(child);
        }

        population = newPopulation;
        setGeneration((prev) => prev + 1);
      };

      const startEvolving = () => {
        if (running) {
          evolve();
          intervalRef.current = setTimeout(startEvolving, 100);
        }
      };

      startEvolving();

      return () => clearTimeout(intervalRef.current);
    };
  }, [targetImage, running]);

  const handlePauseResume = () => {
    setRunning((prev) => {
      if (prev) {
        clearTimeout(intervalRef.current); // Limpia el intervalo al pausar
      }
      return !prev;
    });
  };

  return (
    <div>
      <div className={styles.infoContainer}>
        <h1>Generación: {generation}</h1>
        <h2>Mejor aptitud: {bestFitness}</h2>
      </div>
      <div className={styles.continerCanvasImages}>
        <div className={styles.originalImage}>
          <h2>Imagen Original</h2>
          <canvas
            ref={targetCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ border: "1px solid black" }}
          />
        </div>
        <div className={styles.generatedImage}>
          <h2>Imagen Generada</h2>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ border: "1px solid black" }}
          />
        </div>
      </div>
      <div className={styles.buttonContainer}>
        <button onClick={handlePauseResume}>
          {running ? "Pausar" : "Reanudar"}
        </button>
      </div>
    </div>
  );
}

export function App() {
  const imagePath = [
    "/foxy.jpg",
    "/fish.jpg",
    "/venado.png"
  ] // Ruta de la imagen
  return (
    <div className={styles.containerApp}>
      <h1>Algoritmo Genético - Generación de Imagen</h1>
      <GeneticAlgorithm targetImage={imagePath[2]} />
    </div>
  );
}

export default App;