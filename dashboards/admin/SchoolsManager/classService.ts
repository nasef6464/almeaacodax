import type { Group } from '../../../types';
import { buildNewClassGroup } from './groupFactory';

export function parseBulkClassNames(input: string): string[] {
    return Array.from(new Set<string>(
        input
            .split(/\r?\n|،|,/)
            .map((name) => name.trim())
            .filter(Boolean),
    ));
}

export function filterNewClassNames(classNames: string[], classes: Group[], schoolId: string): string[] {
    const existingNames = new Set(
        classes
            .filter((group) => group.parentId === schoolId)
            .map((group) => group.name.trim().toLowerCase()),
    );

    return classNames.filter((name) => !existingNames.has(name.toLowerCase()));
}

type BuildBulkClassGroupsInput = {
    classNames: string[];
    schoolId: string;
    ownerId: string;
    now?: number;
};

export function buildBulkClassGroups({
    classNames,
    schoolId,
    ownerId,
    now = Date.now(),
}: BuildBulkClassGroupsInput): Group[] {
    return classNames.map((name, index) => buildNewClassGroup({
        name,
        parentId: schoolId,
        ownerId,
        now,
        index,
    }));
}
