import dayjs from 'dayjs';
import { Template, Property } from '../types/types';

export async function generateFrontmatter(properties: Property[]): Promise<string> {
	let frontmatter = '---\n';
	for (const property of properties) {
		frontmatter += `${property.name}:`;

		switch (property.type) {
			case 'multitext':
				frontmatter += '\n';
				const items = property.value.split(',').map(item => item.trim());
				items.forEach(item => {
					if (item.includes('[[') && item.includes(']]')) {
						frontmatter += `  - "${item}"\n`;
					} else {
						frontmatter += `  - ${item}\n`;
					}
				});
				break;
			case 'number':
				const numericValue = property.value.replace(/[^\d.-]/g, '');
				frontmatter += numericValue ? ` ${parseFloat(numericValue)}\n` : '\n';
				break;
			case 'checkbox':
				frontmatter += ` ${property.value.toLowerCase() === 'true' || property.value === '1'}\n`;
				break;
			case 'date':
			case 'datetime':
				frontmatter += ` "${property.value}"\n`;
				break;
			default: // Text
				frontmatter += ` "${property.value}"\n`;
		}
	}
	frontmatter += '---\n';
	return frontmatter;
}

export function saveToObsidian(fileContent: string, noteName: string, path: string, vault: string, behavior: string, specificNoteName?: string, dailyNoteFormat?: string): void {
	let obsidianUrl: string;
	let content = fileContent;

	// Ensure path ends with a slash
	if (path && !path.endsWith('/')) {
		path += '/';
	}

	if (behavior === 'append-specific' || behavior === 'append-daily') {
		let appendFileName: string;
		if (behavior === 'append-specific') {
			appendFileName = specificNoteName!;
		} else {
			appendFileName = dayjs().format(dailyNoteFormat!);
		}
		obsidianUrl = `obsidian://new?file=${encodeURIComponent(path + appendFileName)}&append=true`;
		
		// Add newlines at the beginning to separate from existing content
		content = '\n\n' + content;
	} else {
		obsidianUrl = `obsidian://new?file=${encodeURIComponent(path + noteName)}`;
	}

	obsidianUrl += `&content=${encodeURIComponent(content)}`;

	const vaultParam = vault ? `&vault=${encodeURIComponent(vault)}` : '';
	obsidianUrl += vaultParam;

	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		const currentTab = tabs[0];
		if (currentTab && currentTab.id) {
			chrome.tabs.update(currentTab.id, { url: obsidianUrl }, function(tab) {
				chrome.notifications.create({
					type: 'basic',
					iconUrl: 'icon.png',
					title: 'Obsidian Clipper',
					message: 'If prompted, select "Always allow" to open Obsidian automatically in the future.'
				});
			});
		}
	});
}

export function sanitizeFileName(fileName: string): string {
	const isWindows = navigator.platform.indexOf('Win') > -1;
	if (isWindows) {
		fileName = fileName.replace(':', '').replace(/[/\\?%*|"<>]/g, '-');
	} else {
		fileName = fileName.replace(':', '').replace(/[/\\]/g, '-');
	}
	return fileName;
}