import { useState } from 'react';
import type { AccessCodesPagination, PagedAccessCode } from './contracts';

export function useSchoolAccessCodeState() {
    const [selectedPackageIdForCode, setSelectedPackageIdForCode] = useState('');
    const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
    const [newCodeMaxUses, setNewCodeMaxUses] = useState('50');
    const [newCodeDurationDays, setNewCodeDurationDays] = useState('30');
    const [pagedAccessCodes, setPagedAccessCodes] = useState<PagedAccessCode[]>([]);
    const [pagedAccessCodesPagination, setPagedAccessCodesPagination] = useState<AccessCodesPagination | null>(null);
    const [isLoadingPagedAccessCodes, setIsLoadingPagedAccessCodes] = useState(false);
    const [pagedAccessCodesError, setPagedAccessCodesError] = useState<string | null>(null);

    const resetPagedAccessCodes = () => {
        setPagedAccessCodes([]);
        setPagedAccessCodesPagination(null);
        setPagedAccessCodesError(null);
        setIsLoadingPagedAccessCodes(false);
    };

    return {
        selectedPackageIdForCode,
        setSelectedPackageIdForCode,
        copiedCodeId,
        setCopiedCodeId,
        newCodeMaxUses,
        setNewCodeMaxUses,
        newCodeDurationDays,
        setNewCodeDurationDays,
        pagedAccessCodes,
        setPagedAccessCodes,
        pagedAccessCodesPagination,
        setPagedAccessCodesPagination,
        isLoadingPagedAccessCodes,
        setIsLoadingPagedAccessCodes,
        pagedAccessCodesError,
        setPagedAccessCodesError,
        resetPagedAccessCodes,
    };
}
