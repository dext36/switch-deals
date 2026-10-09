import { useRef, useState } from 'react';

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

// Film (jeśli jest) jako pierwszy slajd, dalej screeny z IGDB; przewijanie w poziomie ze scroll-snap.
function Carousel({ video, screenshots, title }) {
  const track = useRef(null);
  const [index, setIndex] = useState(0);
  const count = (video ? 1 : 0) + screenshots.length;

  const goTo = (i) => {
    const el = track.current;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };
  const onScroll = () => {
    const el = track.current;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="carousel">
      <div className="track" ref={track} onScroll={onScroll}>
        {video && (
          <div className="slide">
            <Video video={video} title={title} />
          </div>
        )}
        {screenshots.map((src, i) => (
          <div className="slide" key={src}>
            <img src={src} alt={`${title} – screen ${i + 1}`} loading="lazy" />
          </div>
        ))}
      </div>
      {count > 1 && (
        <>
          {index > 0 && (
            <button className="nav prev" onClick={() => goTo(index - 1)} aria-label="Poprzedni">
              ‹
            </button>
          )}
          {index < count - 1 && (
            <button className="nav next" onClick={() => goTo(index + 1)} aria-label="Następny">
              ›
            </button>
          )}
          <span className="counter">
            {index + 1} / {count}
          </span>
        </>
      )}
    </div>
  );
}

const formatDay = (iso) => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });

// Kolor paska wg postępu promocji: zielony (świeża) → żółty → czerwony → brązowy (tuż przed końcem).
const SALE_COLORS = [
  [0, [46, 160, 67]],
  [0.4, [222, 176, 0]],
  [0.75, [214, 58, 47]],
  [1, [122, 74, 36]],
];

function saleColor(progress) {
  const i = SALE_COLORS.findIndex(([stop]) => stop >= progress);
  if (i <= 0) return `rgb(${SALE_COLORS[0][1]})`;
  const [[from, a], [to, b]] = [SALE_COLORS[i - 1], SALE_COLORS[i]];
  const t = (progress - from) / (to - from);
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t))})`;
}

function SaleProgress({ startsAt, endsAt }) {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (!(end > start)) return null;
  const progress = Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
  const percent = Math.round(progress * 100);
  return (
    <div
      className="sale-progress"
      role="progressbar"
      aria-valuenow={percent}
      aria-label="Postęp promocji"
      title={`Promocja od ${formatDay(startsAt)} do ${formatDay(endsAt)} – minęło ${percent}%`}
    >
      <span style={{ width: `${percent}%`, background: saleColor(progress) }} />
    </div>
  );
}

export default function GameCard({ game }) {
  return (
    <li className="card">
      <div className="media">
        {game.video || game.screenshots?.length ? (
          <Carousel video={game.video} screenshots={game.screenshots ?? []} title={game.title} />
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
        {game.communityScore != null && (
          <p className="community" title="Średnia z ocen użytkowników IGDB">
            Gracze: <strong>{game.communityScore}</strong> ({game.communityRatings.toLocaleString('pl-PL')} ocen)
          </p>
        )}
        {game.popularityRank && (
          <p className="popularity" title="Miejsce wśród gier w promocji, według popularności w eShopie Nintendo of Europe">
            Popularność w eShopie: #{game.popularityRank}
          </p>
        )}
        {game.saleEndsAt && <p className="sale-ends">Promocja do {formatDay(game.saleEndsAt)}</p>}
        {game.saleStartsAt && game.saleEndsAt && <SaleProgress startsAt={game.saleStartsAt} endsAt={game.saleEndsAt} />}
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
