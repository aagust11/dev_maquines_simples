import { Link } from 'react-router-dom';

const Editor = () => {
  return (
    <section className="page page--editor">
      <header className="page__header">
        <h1>Editor de simulacions</h1>
        <p>
          Configura i experimenta amb les diferents màquines simples per preparar noves
          activitats a Momentor.
        </p>
      </header>
      <nav className="page__nav">
        <Link to="/" className="page__link">
          Tornar a la galeria
        </Link>
      </nav>
      <article className="page__content">
        <p>
          Aquesta secció oferirà un editor complet per definir escenaris, paràmetres i
          simulacions. De moment, és un espai reservat per al desenvolupament futur.
        </p>
      </article>
    </section>
  );
};

export default Editor;
