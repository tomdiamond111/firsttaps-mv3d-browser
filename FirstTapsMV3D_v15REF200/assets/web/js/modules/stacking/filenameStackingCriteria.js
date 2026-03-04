// ============================================================================
// FILENAME-BASED STACKING CRITERIA - Phase 1 Implementation
// ============================================================================
// This module extends the existing stacking system with filename-specific criteria:
// - 8-character prefix matching
// - Exact filename matching  
// - Numeric/alphabetical sorting within filename stacks

class FilenameStackingCriteria {
    constructor() {
        this.name = 'FilenameStackingCriteria';
        this.version = '1.0.0';
        
        console.log('🎯 FilenameStackingCriteria Phase 1 initialized');
    }

    // ============================================================================
    // PHASE 1: NEW FILENAME-BASED STACKING CRITERIA
    // ============================================================================

    /**
     * Get valid filename-based stacking criteria
     * @returns {Array} Array of valid filename criteria
     */
    getValidFilenameCriteria() {
        return [
            'filename8CharPrefix',    // Group by first 8 characters of filename
            'filenameExact',         // Group by exact filename match
            'filenameNumericAlpha'   // Group by numeric/alphabetical patterns
        ];
    }

    /**
     * Validate if a criteria is filename-based
     * @param {string} criteria - Criteria to validate
     * @returns {boolean} True if it's a valid filename criteria
     */
    isValidFilenameCriteria(criteria) {
        return this.getValidFilenameCriteria().includes(criteria);
    }

    /**
     * Get filename-based stacking criteria for an object
     * @param {Object} object - 3D object to analyze
     * @param {string} criteria - The filename criteria type
     * @returns {Object} Criteria object for stacking
     */
    getFilenameStackingCriteria(object, criteria) {
        const fileData = object.userData?.fileData;
        const fileName = fileData?.name || object.userData?.fileName || '';
        
        if (!fileName) {
            console.warn('No filename found for object:', object);
            return { criteria: criteria, value: 'unknown' };
        }

        switch (criteria) {
            case 'filename8CharPrefix':
                return this.get8CharPrefixCriteria(fileName);
                
            case 'filenameExact':
                return this.getExactFilenameCriteria(fileName);
                
            case 'filenameNumericAlpha':
                return this.getNumericAlphaCriteria(fileName);
                
            default:
                console.warn('Unknown filename criteria:', criteria);
                return { criteria: criteria, value: 'default' };
        }
    }

    /**
     * Get 8-character prefix criteria for filename stacking
     * @param {string} fileName - The filename to analyze
     * @returns {Object} Criteria object
     */
    get8CharPrefixCriteria(fileName) {
        const prefix = fileName.substring(0, 8).toLowerCase();
        return {
            criteria: 'filename8CharPrefix',
            value: prefix,
            displayName: `Prefix: "${prefix}"`
        };
    }

    /**
     * Get exact filename criteria (without extension)
     * @param {string} fileName - The filename to analyze
     * @returns {Object} Criteria object
     */
    getExactFilenameCriteria(fileName) {
        // Remove extension for exact matching
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '').toLowerCase();
        return {
            criteria: 'filenameExact',
            value: nameWithoutExt,
            displayName: `Name: "${nameWithoutExt}"`
        };
    }

    /**
     * Get numeric/alphabetical pattern criteria
     * @param {string} fileName - The filename to analyze
     * @returns {Object} Criteria object
     */
    getNumericAlphaCriteria(fileName) {
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        
        // Check if filename starts with numbers
        const startsWithNumber = /^[0-9]/.test(nameWithoutExt);
        
        if (startsWithNumber) {
            // Extract leading numbers
            const numberMatch = nameWithoutExt.match(/^([0-9]+)/);
            const leadingNumbers = numberMatch ? numberMatch[1] : '';
            return {
                criteria: 'filenameNumericAlpha',
                value: `numeric_${leadingNumbers.padStart(5, '0')}`, // Pad for proper sorting
                displayName: `Numeric: ${leadingNumbers}*`,
                sortValue: parseInt(leadingNumbers, 10) || 0
            };
        } else {
            // Alphabetical grouping by first letter
            const firstLetter = nameWithoutExt.charAt(0).toUpperCase();
            return {
                criteria: 'filenameNumericAlpha',
                value: `alpha_${firstLetter}`,
                displayName: `Alpha: ${firstLetter}*`,
                sortValue: firstLetter
            };
        }
    }

    // ============================================================================
    // SORTING HELPERS FOR FILENAME CRITERIA
    // ============================================================================

    /**
     * Compare two objects using filename-based criteria
     * @param {Object} objA - First object
     * @param {Object} objB - Second object  
     * @param {string} criteria - Filename criteria type
     * @returns {number} Comparison result (-1, 0, 1)
     */
    compareObjectsByFilenameCriteria(objA, objB, criteria) {
        const criteriaA = this.getFilenameStackingCriteria(objA, criteria);
        const criteriaB = this.getFilenameStackingCriteria(objB, criteria);

        // For numeric/alpha criteria, use special sorting
        if (criteria === 'filenameNumericAlpha') {
            return this.compareNumericAlphaCriteria(criteriaA, criteriaB);
        }

        // Standard string comparison for other criteria
        const valueA = criteriaA.value;
        const valueB = criteriaB.value;
        
        if (valueA < valueB) return -1;
        if (valueA > valueB) return 1;
        return 0;
    }

    /**
     * Special comparison for numeric/alphabetical criteria
     * @param {Object} criteriaA - First criteria object
     * @param {Object} criteriaB - Second criteria object
     * @returns {number} Comparison result
     */
    compareNumericAlphaCriteria(criteriaA, criteriaB) {
        const valueA = criteriaA.value;
        const valueB = criteriaB.value;
        
        // Check if both are numeric or both are alphabetic
        const aIsNumeric = valueA.startsWith('numeric_');
        const bIsNumeric = valueB.startsWith('numeric_');
        
        if (aIsNumeric && bIsNumeric) {
            // Both numeric - compare numeric values
            return criteriaA.sortValue - criteriaB.sortValue;
        } else if (!aIsNumeric && !bIsNumeric) {
            // Both alphabetic - compare strings
            return criteriaA.sortValue.localeCompare(criteriaB.sortValue);
        } else {
            // Mixed - numeric comes before alphabetic
            return aIsNumeric ? -1 : 1;
        }
    }

    /**
     * Check if two filename criteria objects should be in the same stack
     * @param {Object} criteriaA - First criteria object
     * @param {Object} criteriaB - Second criteria object
     * @returns {boolean} True if they should be stacked together
     */
    shouldFilenameObjectsBeInSameStack(criteriaA, criteriaB) {
        if (!criteriaA || !criteriaB) return false;
        if (criteriaA.criteria !== criteriaB.criteria) return false;
        
        return criteriaA.value === criteriaB.value;
    }

    // ============================================================================
    // INTEGRATION HELPERS
    // ============================================================================

    /**
     * Get user-friendly labels for filename criteria
     * @returns {Object} Map of criteria to display names
     */
    getFilenameCriteriaLabels() {
        return {
            'filename8CharPrefix': '8-Character Prefix',
            'filenameExact': 'Exact Filename',
            'filenameNumericAlpha': 'Numeric/Alphabetical'
        };
    }

    /**
     * Get description for filename criteria
     * @param {string} criteria - Criteria type
     * @returns {string} User-friendly description
     */
    getFilenameCriteriaDescription(criteria) {
        const descriptions = {
            'filename8CharPrefix': 'Groups files with identical first 8 characters',
            'filenameExact': 'Groups files with exactly the same name',
            'filenameNumericAlpha': 'Groups files by numeric prefixes or alphabetical order'
        };
        
        return descriptions[criteria] || 'Unknown filename criteria';
    }

    // ============================================================================
    // TESTING AND DEBUG HELPERS
    // ============================================================================

    /**
     * Test filename criteria with sample data
     * @param {Array} sampleFilenames - Array of sample filenames to test
     * @returns {Object} Test results
     */
    testFilenameCriteria(sampleFilenames = []) {
        const defaultSamples = [
            'document_01.pdf',
            'document_02.pdf', 
            'document_10.pdf',
            'report_01.docx',
            'report_02.docx',
            'analysis_2024_01.xlsx',
            'analysis_2024_02.xlsx',
            'apple_notes.txt',
            'apple_shopping.txt',
            'banana_recipe.txt',
            '001_first.jpg',
            '002_second.jpg',
            '010_tenth.jpg'
        ];
        
        const testFiles = sampleFilenames.length > 0 ? sampleFilenames : defaultSamples;
        const results = {
            totalFiles: testFiles.length,
            criteria: {},
            summary: {}
        };
        
        // Test each criteria type
        this.getValidFilenameCriteria().forEach(criteria => {
            const criteriaResults = testFiles.map(filename => {
                const mockObject = {
                    userData: {
                        fileData: { name: filename }
                    }
                };
                return {
                    filename: filename,
                    criteria: this.getFilenameStackingCriteria(mockObject, criteria)
                };
            });
            
            results.criteria[criteria] = criteriaResults;
            
            // Count unique groups
            const uniqueValues = new Set(criteriaResults.map(r => r.criteria.value));
            results.summary[criteria] = {
                uniqueGroups: uniqueValues.size,
                groups: Array.from(uniqueValues)
            };
        });
        
        console.log('📊 Filename Criteria Test Results:', results);
        return results;
    }
}

// ============================================================================
// GLOBAL REGISTRATION FOR EXISTING STACKING SYSTEM
// ============================================================================

// Make it available globally for integration with existing system
if (typeof window !== 'undefined') {
    window.FilenameStackingCriteria = FilenameStackingCriteria;
    
    // Add test function to global scope
    window.testFilenameCriteria = function(sampleFilenames) {
        const criteria = new FilenameStackingCriteria();
        return criteria.testFilenameCriteria(sampleFilenames);
    };
    
    console.log('✅ FilenameStackingCriteria available globally');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilenameStackingCriteria;
}
