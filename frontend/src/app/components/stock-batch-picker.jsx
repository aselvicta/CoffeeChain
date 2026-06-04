export function StockBatchPicker({
  batches,
  selectedBatchId,
  onSelect,
  disabled = false,
  emptyMessage = 'No batches available.',
}) {
  if (!batches.length) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Your batches</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {batches.map((batch) => {
          const selected = String(selectedBatchId) === String(batch.batchId);
          return (
            <button
              key={batch.batchId}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(batch.batchId)}
              className={`rounded-xl border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? 'border-green-500 bg-green-50 ring-2 ring-green-500/20'
                  : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/40'
              }`}
            >
              <p className="font-semibold text-gray-900">
                {batch.batchCode || `Batch ${batch.batchId}`}
              </p>
              <p className="mt-0.5 text-sm text-gray-600">
                {batch.fertilizerType || 'Fertilizer'}
              </p>
              <p className="mt-2 text-sm font-medium text-green-700">
                {batch.bagsAvailable} bags available
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
