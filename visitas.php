<?php
/* RAVEN VJ — contador de visitantes (por dispositivo).
   GET            → devuelve el total actual sin sumar.
   GET ?new=1     → suma 1 (el cliente lo llama solo la primera vez por dispositivo)
                    y devuelve el número asignado. */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');
$f = __DIR__ . '/visitas.txt';
$n = 0;
$fp = @fopen($f, 'c+');
if ($fp && flock($fp, LOCK_EX)) {
  $n = (int) stream_get_contents($fp);
  if (isset($_GET['new'])) {
    $n++;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, (string) $n);
  }
  flock($fp, LOCK_UN);
  fclose($fp);
}
echo json_encode(['n' => $n]);
