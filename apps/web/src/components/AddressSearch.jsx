import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, MapPin } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

// Detects direct coordinate input like "50.359120, 5.378172"
const COORD_REGEX = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

const parseCoordinates = (searchQuery) => {
  const match = searchQuery.match(COORD_REGEX);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

const AddressSearch = ({ onAddressSelect, onError }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef(null);
  const timeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const searchAddress = async (searchQuery) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);

    try {
      // Using Nominatim as a free alternative to Google Places API for this demo environment
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=be&limit=5&addressdetails=1`,
        {
          headers: { 'User-Agent': 'RoofCleaningQuoteGenerator/1.0' },
          signal: abortControllerRef.current.signal
        }
      );
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Address search error:', error);
      if (onError) onError(error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (newValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Direct coordinate input: skip Nominatim and offer the parsed coords
    const coords = parseCoordinates(newValue);
    if (coords) {
      setSuggestions([{
        place_id: `coord-${coords.lat}-${coords.lng}`,
        display_name: `Coordonnées ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
        lat: String(coords.lat),
        lon: String(coords.lng),
        isCoordinate: true
      }]);
      setShowSuggestions(true);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      searchAddress(newValue);
    }, 500);
  };

  const handleSelect = (suggestion) => {
    setQuery(suggestion.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    
    if (onAddressSelect) {
      onAddressSelect({
        address: suggestion.display_name,
        lat: parseFloat(suggestion.lat),
        lng: parseFloat(suggestion.lon)
      });
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (abortControllerRef.current) abortControllerRef.current.abort();
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition duration-150 ease-in-out"
          placeholder={t('address_input.placeholder', 'Search for your address...')}
          value={query}
          onChange={handleInputChange}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          ) : query ? (
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.place_id}-${index}`}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-gray-900 flex items-center gap-2"
              onClick={() => handleSelect(suggestion)}
            >
              {suggestion.isCoordinate ? (
                <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
              ) : (
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
              <span className="block truncate">{suggestion.display_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressSearch;