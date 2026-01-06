/**
 * サービス層エクスポート
 * Music Bubble Explorer V2
 */

export { FirebaseService, firebaseService } from './firebaseService'
export { CacheService, cacheService } from './cacheService'
export {
  FilterService,
  filterService,
  filterSongs,
  filterSongsByArtist,
  matchesArtistFilter,
  matchesGenreFilter,
  matchesFilter,
  extractAvailableGenres,
  getAvailableGenresForArtist,
} from './filterService'
export {
  SongSearchService,
  songSearchService,
  searchSongs,
  matchesSearchQuery,
  matchesTitleSearch,
  matchesArtistSearch,
  matchesLyricistSearch,
  matchesComposerSearch,
  matchesArrangerSearch,
  type SearchField,
  type SearchOptions,
} from './songSearchService'
