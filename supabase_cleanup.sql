-- Función para mantener solo los 100 mejores puntajes en la tabla leaderboard
CREATE OR REPLACE FUNCTION cleanup_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  -- Eliminar registros que no estén dentro de los 100 mejores (ordenados por score DESC, time_ms ASC)
  DELETE FROM leaderboard
  WHERE id NOT IN (
    SELECT id
    FROM leaderboard
    ORDER BY score DESC, time_ms ASC
    LIMIT 100
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta después de cada inserción en la tabla leaderboard
DROP TRIGGER IF EXISTS trigger_cleanup_leaderboard ON leaderboard;
CREATE TRIGGER trigger_cleanup_leaderboard
AFTER INSERT ON leaderboard
FOR EACH STATEMENT
EXECUTE FUNCTION cleanup_leaderboard();
