# AI Trail Deduplication Specification

## Overview
This specification outlines the process of preventing duplicate trail entries during the trail creation process. When using AI to assist in creating new trails, the system will check existing trails in the database to ensure that newly suggested trails don't overlap with already documented trails.

## Core Requirements

### 1. Trail Matching Logic
- **Name Similarity**
  - Implement fuzzy matching for trail names
  - Account for common variations (e.g., "Mt." vs "Mount")
  - Set similarity threshold (e.g., 80%)

### 2. Implementation Details

#### Database Query
```typescript
interface TrailComparisonData {
  name: string;
  coordinates: string;
  distance: string;
  elevation: string;
  location: string;
}
```

#### Matching Process
1. During trail creation process only:
   - Query existing trails in the area
   - Compare each AI suggestion against existing trails
   - Filter out suggestions that match existing trails
   - Return only unique suggestions

#### Confidence Scoring
- Calculate match confidence based on:
  - Coordinate proximity (40%)
  - Name similarity (30%)
  - Trail characteristics (30%)
- Exclude suggestions with confidence score above threshold (e.g., 75%)

### 3. API Changes

#### Modified Response Format
```typescript
interface AITrailResponse {
  suggestions: Trail[];
  filtered: {
    count: number;
    reason: string;
  };
}
```

#### Request Parameters
- Add optional parameters:
  - `deduplication_radius`: number (km)
  - `similarity_threshold`: number (0-100)
  - `include_filtered`: boolean

### 4. Performance Considerations
- Implement spatial indexing for coordinate comparison
- Cache frequent location queries
- Limit comparison to trails within relevant geographical bounds
- Optimize string comparison algorithms

## Technical Implementation

### 1. Storage Interface Updates
- Add method to query trails by geographical bounds
- Implement coordinate-based search functionality
- Add indexing for efficient spatial queries

### 2. API Route Modifications
- Update `/api/trails/ai-suggest` endpoint
- Add deduplication logic
- Include filtering metadata in response
- Handle error cases for invalid coordinates

### 3. Frontend Changes
- Update AI suggestion modal in trail creation form
- Display filtered suggestion count
- Add option to view filtered suggestions
- Show matching confidence scores

## Validation Process
1. Test with various locations
2. Verify accuracy of duplicate detection
3. Measure performance impact
4. Validate coordinate comparison logic
5. Test edge cases:
   - Similar names, different locations
   - Different names, same location
   - Partial trail overlaps

## Success Criteria
- No duplicate trails suggested during creation
- Performance under 2 seconds for suggestion generation
- Accurate matching for at least 95% of cases
- Clear feedback when suggestions are filtered
- Maintainable and extensible implementation

## Important Note
This deduplication process is specifically designed for and limited to the trail creation workflow. It is not intended to be used as a general trail recommendation engine. The duplicate detection logic is implemented only when users are creating new trails using AI suggestions.

## Future Considerations
- The duplicate detection logic could be adapted for a future recommendation engine
- Current implementation focuses on creation-time validation only
- Separate recommendation engine would require different matching criteria
- Different thresholds might be needed for recommendations vs duplicate prevention