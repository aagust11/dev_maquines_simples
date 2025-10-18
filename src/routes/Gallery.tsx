import { Link } from 'react-router-dom';

const Gallery = () => {
  return (
    <section className="page page--gallery">
      <header className="page__header">
        <h1>Momentor</h1>
        <p>Explora la col·lecció d'activitats i simulacions de màquines simples.</p>
      </header>
      <nav className="page__nav">
        <Link to="/editor" className="page__link">
          Obrir l'editor
        </Link>
      </nav>
      <article className="page__content">
        <p>
          Aviat hi trobaràs una galeria de recursos interactius dissenyats per facilitar la
          comprensió de les màquines simples i dels seus principis físics.
        </p>
      </article>
    </section>
  );
};

export default Gallery;
