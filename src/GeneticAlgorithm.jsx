import React, { useEffect, useRef, useState } from "react";

const CANVAS_WIDTH = 200;
const CANVAS_HEIGHT = 200;
const POPULATION_SIZE = 50;

export function GeneticAlgorithm ({targetImage}) {
    console.log("targetImage recibido:", targetImage);
    const canvasRef = useRef(null);
    const targetCanvasRef = useRef(null);
    const [generation, setGeneration] = useState(0);
    const [bestFitness, setBestFitness] = useState(null);
    const [running, setRunning] = useState(true);
    const [colors, setColors] = useState([]);
  
    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const targetCanvas = targetCanvasRef.current;
      const targetCtx = targetCanvas.getContext("2d");
  
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = targetImage;
      console.log("Estableciendo imagen en:", img.src);
      img.onload = () => {
        console.log("Imagen cargada");
        targetCtx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
        // Extraer colores
        const colorSamples = [];
        const targetData = targetCtx.getImageData(
          0,
          0,
          CANVAS_WIDTH,
          CANVAS_HEIGHT
        ).data;
  
        for (let i = 0; i < targetData.length; i += 4) {
          const rgba = `rgba(${targetData[i]}, ${targetData[i + 1]}, ${
            targetData[i + 2]
          }, ${targetData[i + 3]})`;
          colorSamples.push(rgba);
        }
  
        setColors(colorSamples);
  
        // Inicializa la población
        let population = Array.from({ length: POPULATION_SIZE }, () =>
          createIndividual(colorSamples)
        );
        let interval;
  
        const evolve = () => {
          console.log("Evolucionando...");
          // Evaluar aptitud
          population.forEach((individual) => {
            individual.fitness = calculateFitness(ctx, individual, targetCtx);
          });
  
          // Ordenar la población por fitness
          population.sort((a, b) => a.fitness - b.fitness);
  
          // Mostrar el mejor individuo
          const bestIndividual = population[0];
          drawIndividual(ctx, bestIndividual);
          setBestFitness(bestIndividual.fitness);
  
          // Reproducción
          const newPopulation = [];
          while (newPopulation.length < POPULATION_SIZE) {
            const parent1 = selectParent(population);
            const parent2 = selectParent(population);
            const child = crossover(parent1, parent2);
            mutate(child, colors); // Asegúrate de pasar los colores aquí
            newPopulation.push(child);
          }
  
          population = newPopulation;
          setGeneration((prev) => prev + 1);
        };
  
        const startEvolving = () => {
          if (running) {
            evolve();
            interval = setTimeout(startEvolving, 100); // Ejecutar de nuevo en 100ms
          }
        };
  
        if (running) {
          startEvolving(); // Inicia la evolución
        }
  
        // Limpia el intervalo cuando el componente se desmonta o cuando se pausa
        return () => clearTimeout(interval);
      };
    }, [targetImage, running]); // Escuchar cambios en 'targetImage' y 'running'
  
    // Función para manejar la pausa y reanudación
    const handlePauseResume = () => {
      setRunning((prev) => !prev);
    };
  
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ marginRight: "20px" }}>
          <h2>Imagen Original</h2>
          <canvas
            ref={targetCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ border: "1px solid black" }}
          />
        </div>
        <div>
          <h1>Generación: {generation}</h1>
          <h2>Mejor aptitud: {bestFitness}</h2>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ border: "1px solid black" }}
          />
          <button onClick={handlePauseResume}>
            {running ? "Pausar" : "Reanudar"}
          </button>
        </div>
      </div>
    );
}
