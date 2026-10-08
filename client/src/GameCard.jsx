import { useState } from 'react';

function Video({ video, title }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1`}
        title={video.title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <button className="thumb" onClick={() => setPlaying(true)} aria-label={`Odtwórz gameplay: ${title}`}>
      <img src={video.thumbnail} alt="" loading="lazy" />
      <span className="play">▶</span>
    </button>
  );
}

const formatDay = (iso) => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });

export default function GameCard({ game }) {
  return (
    <li className="card">
      <div className="media">
        {game.video ? (
          <Video video={game.video} title={game.title} />
        ) : (
          game.image && <img src={game.image} alt="" loading="lazy" />
        )}
      </div>
      <div className="body">
        <div className="title-row">
          <h2>
            <a href={game.url} target="_blank" rel="noreferrer">
              {game.title}
            </a>
          </h2>
          <a
            className="score"
            href={game.igdbUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            title={game.criticReviews ? `Średnia z ${game.criticReviews} recenzji krytyków (IGDB)` : 'Ocena krytyków (IGDB)'}
          >
            {game.criticScore}
          </a>
        </div>
        <p className="prices">
          {game.price && <strong>{game.price}</strong>}
          {game.originalPrice && <s>{game.originalPrice}</s>}
          {game.discount != null && <span className="discount">-{game.discount}%</span>}
        </p>
        {game.saleEndsAt && <p className="sale-ends">Promocja do {formatDay(game.saleEndsAt)}</p>}
        {game.video ? (
          <p className="video-meta">
            {game.video.channel ? `${game.video.title} · ${game.video.channel}` : game.video.title}
          </p>
        ) : (
          <a className="yt-link" href={game.youtubeSearchUrl} target="_blank" rel="noreferrer">
            Szukaj gameplayu na YouTube →
          </a>
        )}
      </div>
    </li>
  );
}
