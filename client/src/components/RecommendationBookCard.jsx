import UnifiedBookCard from './UnifiedBookCard';
export default function RecommendationBookCard({ book, onAdd, isAdding = false, isAdded = false, disabled = false }) {
  return <UnifiedBookCard book={book} onAdd={isAdded ? undefined : onAdd} adding={isAdding} disabled={disabled} />;
}
