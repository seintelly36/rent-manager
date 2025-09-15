import React from 'react';

// Define the shape of the 'terms' object that this component expects.
// It's a flexible record of key-value pairs, but we know 'lease_term' and 'notes' might exist.
interface Terms {
  lease_term?: string;
  notes?: string;
  [key: string]: any; // Allows for other potential terms in the future
}

// Define the props for the component.
interface LeaseTermsProps {
  terms?: Terms | null;
}

/**
 * A component that displays additional lease terms, such as term length and notes.
 * It will render nothing if no terms are provided or the terms object is empty.
 */
export function LeaseTerms({ terms }: LeaseTermsProps) {
  // Guard clause: If terms are null, undefined, or an empty object, render nothing.
  if (!terms || Object.keys(terms).length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Lease Terms</h3>
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Conditionally render the 'Lease Term' if it exists */}
          {terms.lease_term && (
            <div>
              <p className="text-sm font-medium text-gray-700">Lease Term</p>
              <p className="text-gray-900">{terms.lease_term}</p>
            </div>
          )}
          {/* Conditionally render 'Notes' if they exist */}
          {terms.notes && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-700">Notes</p>
              <p className="text-gray-900 whitespace-pre-wrap">{terms.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}