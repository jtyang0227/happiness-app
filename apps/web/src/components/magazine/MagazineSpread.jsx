import FullBleedSpread    from './spreads/FullBleedSpread';
import SplitSpread        from './spreads/SplitSpread';
import EditorialSpread    from './spreads/EditorialSpread';
import TriptychSpread     from './spreads/TriptychSpread';
import FeatureSpread      from './spreads/FeatureSpread';
import PortraitFocusSpread from './spreads/PortraitFocusSpread';
import FilmStripSpread    from './spreads/FilmStripSpread';

const SPREAD_MAP = {
  FULL_BLEED:     FullBleedSpread,
  SPLIT:          SplitSpread,
  EDITORIAL:      EditorialSpread,
  TRIPTYCH:       TriptychSpread,
  FEATURE:        FeatureSpread,
  PORTRAIT_FOCUS: PortraitFocusSpread,
  FILM_STRIP:     FilmStripSpread,
};

export default function MagazineSpread({ photo, supportPhotos, pageNumber, totalPages }) {
  const panType = photo?.panType || 'EDITORIAL';
  const SpreadComponent = SPREAD_MAP[panType] || EditorialSpread;

  return (
    <div
      role="article"
      aria-label={`면 ${pageNumber} / ${totalPages}, ${panType}`}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <SpreadComponent
        photo={photo}
        supportPhotos={supportPhotos || []}
        pageNumber={pageNumber}
        totalPages={totalPages}
      />
    </div>
  );
}
