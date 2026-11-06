import React from 'react';
import { Search, X, ArrowUpDown } from 'lucide-react';
import { CATEGORIES } from '../data/initialEchoes';

function SearchFilterBar({
  searchQuery,
  onSearchChange,
  activeCategory,
  onSelectCategory,
  sortBy,
  onSortChange,
  categoryCounts
}) {
  return (
    <div className="search-filter-wrapper">
      <div className="search-box-container">
        <Search className="search-box-icon" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by keywords, recipient name, or #ECHO ID..."
          className="search-input-field"
        />
        {searchQuery && (
          <button 
            className="search-clear-btn" 
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="filter-controls-row">
        {/* Category Pills */}
        <div className="category-chips-list">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] ?? 0;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`category-chip ${isSelected ? 'selected' : ''}`}
              >
                <span>{cat.label}</span>
                <span className="chip-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Sort Selector */}
        <div className="sort-selector-box">
          <ArrowUpDown size={15} className="sort-icon" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="sort-dropdown"
          >
            <option value="newest">Newest First</option>
            <option value="most-felt">Most Felt (Hearts)</option>
            <option value="most-shared">Most Resonated (Shares)</option>
            <option value="most-discussed">Most Discussed (Replies)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default React.memo(SearchFilterBar);
