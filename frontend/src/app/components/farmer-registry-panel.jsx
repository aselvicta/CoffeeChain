import { useMemo, useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  Building2,
  IdCard,
  Loader2,
  X,
} from 'lucide-react';
import { lookupMinistryFarmer, registerFarmer } from '../api/client';
import { PanelOutlineButton, PanelPrimaryButton } from './ui/dashboard-ui';

const initialLookupState = {
  status: 'idle',
  record: null,
  error: '',
};

export function FarmerRegistryPanel({ farmers, userProfile, onRegistered }) {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ministryIdInput, setMinistryIdInput] = useState('');
  const [lookupState, setLookupState] = useState(initialLookupState);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const filteredFarmers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return farmers;
    return farmers.filter((farmer) => {
      const haystack = [
        farmer.name,
        farmer.ministryId,
        farmer.village,
        farmer.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [search, farmers]);

  const resetDialog = () => {
    setMinistryIdInput('');
    setLookupState(initialLookupState);
    setRegistrationError('');
  };

  const openDialog = () => {
    resetDialog();
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTimeout(resetDialog, 200);
  };

  const handleLookup = async (event) => {
    event?.preventDefault?.();
    const id = ministryIdInput.trim();
    if (!id) return;
    setLookupState({ status: 'loading', record: null, error: '' });
    setRegistrationError('');
    try {
      const record = await lookupMinistryFarmer(id);
      setLookupState({ status: 'found', record, error: '' });
    } catch (error) {
      setLookupState({
        status: 'error',
        record: null,
        error: error.message || 'Lookup failed',
      });
    }
  };

  const handleConfirmRegister = async () => {
    if (!lookupState.record) return;
    setIsRegistering(true);
    setRegistrationError('');
    try {
      await registerFarmer({ ministry_id: lookupState.record.ministry_id });
      setSuccessMessage(
        `${lookupState.record.name} (${lookupState.record.ministry_id}) was registered with your AMCOS.`
      );
      closeDialog();
      onRegistered?.();
    } catch (error) {
      setRegistrationError(error.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  const registeredWithThisAmcos =
    lookupState.record?.is_registered &&
    lookupState.record?.current_cooperative?.id === userProfile?.branchId;

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-green-600 hover:text-green-800"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Farmer Registry</h2>
            <p className="text-sm text-gray-600">
              Farmers registered with {userProfile?.organization || 'this AMCOS'}.
              New farmers must exist in the Ministry of Agriculture registry.
            </p>
          </div>
          <PanelOutlineButton icon={UserPlus} onClick={openDialog}>
            Register Farmer
          </PanelOutlineButton>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, Ministry ID, village, or phone"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500"
          />
        </div>

        {filteredFarmers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              {farmers.length === 0
                ? 'No farmers registered yet.'
                : 'No farmers match your search.'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {farmers.length === 0
                ? 'Use the "Register Farmer" button to add a farmer from the Ministry registry.'
                : 'Try a different keyword.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Ministry ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Village
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Phone
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredFarmers.map((farmer) => (
                  <tr key={farmer.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {farmer.ministryId}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {farmer.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {farmer.village || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {farmer.phone || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-gray-500">
          {filteredFarmers.length} of {farmers.length} farmer
          {farmers.length === 1 ? '' : 's'} shown
        </p>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={isRegistering ? undefined : closeDialog}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Register Farmer</h3>
                <p className="text-xs text-gray-500">
                  Look up a farmer in the Ministry of Agriculture registry and
                  confirm their details before adding them to your AMCOS.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={isRegistering}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <form onSubmit={handleLookup} className="space-y-2">
                <label
                  htmlFor="ministry-id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Ministry of Agriculture ID
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <IdCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="ministry-id"
                      type="text"
                      value={ministryIdInput}
                      onChange={(event) => setMinistryIdInput(event.target.value)}
                      placeholder="e.g. MOA-KAG-010"
                      className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm uppercase focus:border-transparent focus:ring-2 focus:ring-green-500"
                      autoFocus
                      disabled={lookupState.status === 'loading' || isRegistering}
                    />
                  </div>
                  <PanelOutlineButton
                    type="submit"
                    icon={lookupState.status === 'loading' ? Loader2 : Search}
                    disabled={
                      !ministryIdInput.trim() ||
                      lookupState.status === 'loading' ||
                      isRegistering
                    }
                    className={lookupState.status === 'loading' ? '[&_svg]:animate-spin' : ''}
                  >
                    {lookupState.status === 'loading' ? 'Looking up' : 'Look up'}
                  </PanelOutlineButton>
                </div>
                <p className="text-xs text-gray-500">
                  The Ministry registry will provide the farmer's full details
                  automatically. You must confirm them before registration.
                </p>
              </form>

              {lookupState.status === 'error' && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Farmer not found
                    </p>
                    <p className="text-xs text-red-700">{lookupState.error}</p>
                  </div>
                </div>
              )}

              {lookupState.status === 'found' && lookupState.record && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Ministry of Agriculture Record
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <IdCard className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Ministry ID</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {lookupState.record.ministry_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Full name</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {lookupState.record.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {lookupState.record.phone_number || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Location</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {[lookupState.record.district, lookupState.record.region]
                              .filter(Boolean)
                              .join(', ') || '—'}
                          </p>
                        </div>
                      </div>
                      {lookupState.record.cooperative_name && (
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">
                              Ministry-listed cooperative
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {lookupState.record.cooperative_name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {registeredWithThisAmcos && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                      <div className="text-sm text-amber-800">
                        This farmer is already registered with your AMCOS.
                        Confirming will refresh their details from the Ministry
                        registry.
                      </div>
                    </div>
                  )}

                  {!registeredWithThisAmcos &&
                    lookupState.record.is_registered &&
                    lookupState.record.current_cooperative && (
                      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                        <div className="text-sm text-red-800">
                          This farmer is currently registered with{' '}
                          <span className="font-semibold">
                            {lookupState.record.current_cooperative.name}
                          </span>
                          . Contact an administrator to transfer registration.
                        </div>
                      </div>
                    )}

                  {registrationError && (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                      <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                      <p className="text-sm text-red-800">{registrationError}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isRegistering}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <PanelPrimaryButton
                icon={isRegistering ? Loader2 : CheckCircle2}
                onClick={handleConfirmRegister}
                disabled={
                  lookupState.status !== 'found' ||
                  isRegistering ||
                  (lookupState.record?.is_registered &&
                    lookupState.record?.current_cooperative?.id !==
                      userProfile?.branchId)
                }
                className={isRegistering ? '[&_svg]:animate-spin' : ''}
              >
                {isRegistering ? 'Registering' : 'Confirm & Register'}
              </PanelPrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
