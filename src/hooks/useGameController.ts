import { useGameStore } from '../store/useGameStore';

export const GameController = () => {
  const { 
    players, 
    setMoving, 
    nextTurn,
    teleportPlayer,
  } = useGameStore();

  // We need a way to listen for when a specific player finishes moving.
  // The Rocket component calls onMovementComplete.
  // But we need a centralized handler to trigger the wormhole check.
  
  const handleMovementComplete = (playerId: number) => {
    // Only proceed if the player was actually in a "moving" state
    const player = players.find(p => p.id === playerId);
    if (!player || !player.isMoving) return;

    setMoving(playerId, false);
    
    // Check Wormhole Logic
    // Delay slightly for dramatic effect
    setTimeout(() => {
        checkWormhole(player);
    }, 500);
  };

  const checkWormhole = (player: any) => {
      const currentTile = player.position;
      
      // No wormholes on start or finish
      if (currentTile === 1 || currentTile === 100) {
          nextTurn();
          return;
      }

      // 25% Chance
      const isWormhole = Math.random() < 0.25;
      
      if (isWormhole) {
          let destination = Math.floor(Math.random() * 99) + 1; // 1 to 99
          // Ensure destination is not 100
          if (destination === 100) destination = 99;
          
          if (destination === currentTile) {
               // Unlucky, same spot
               nextTurn();
               return;
          }

          const isBoost = destination > currentTile;
          console.log(isBoost ? "WORMHOLE BOOST!" : "WORMHOLE GLITCH!");
          
          // Trigger Teleport
          // TODO: Play Sound here
          
          teleportPlayer(player.id, destination);
          
          // After teleport, end turn? Or allow teleport animation?
          // Since teleport is instant in data, but we might want animation.
          // For now, assume teleport is instant-ish or spring will handle it fast.
          setTimeout(() => {
              nextTurn();
          }, 1000); 

      } else {
          nextTurn();
      }
  };

  return { handleMovementComplete };
};
