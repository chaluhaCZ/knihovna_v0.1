import { characters } from './characters.js';

const sheet = document.querySelector('#marker-sheet');
for (const character of characters) {
  for (const { marker, title, placement } of [
    { marker: character.hideout, title: `Find ${character.name.toLowerCase()}`, placement: 'Place at the hiding spot.' },
    { marker: character.page, title: character.book, placement: `Place on the book page to return ${character.name.toLowerCase()}.` },
  ]) {
    const card = document.createElement('article');
    const heading = document.createElement('h2');
    const orientation = document.createElement('span');
    const image = new Image();
    const instructions = document.createElement('p');
    heading.textContent = title;
    orientation.textContent = '↑ Top';
    image.src = marker.image;
    image.alt = `Scanning marker for ${title}`;
    image.width = 400;
    image.height = 400;
    instructions.textContent = placement;
    card.append(heading, orientation, image, instructions);
    sheet.append(card);
  }
}
document.querySelector('#print').addEventListener('click', () => window.print());
