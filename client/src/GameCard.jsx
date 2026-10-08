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
        <h2>
          <a href={game.url} target="_blank" rel="noreferrer">
            {game.title}
          </a>
        </h2>
        <p className="prices">
          {game.price && <strong>{game.price}</strong>}
          {game.originalPrice && <s>{game.originalPrice}</s>}
          {game.discount != null && <span className="discount">-{game.discount}%</span>}
        </p>
        {game.video ? (
          <p className="video-meta">
            {game.video.title} · {game.video.channel}
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
