function tocarSom(nota) {
    const som =
document.getElementById(nota);
       if (som) {
        som.currentTime = 0;
        som.play();
       }
}