/** Site- en contactgegevens voor de footer en de metadata. Een link verdwijnt als de waarde 'TODO' of leeg is. */
export const site = {
	url: 'https://mob.vdhorst.dev',
	author: 'Julian van der Horst',
	githubUrl: 'https://github.com/Gulianrdgd',
	contactEmail: 'julian@vdhorst.dev'
};

export const isSet = (value: string) => value.trim() !== '' && value.trim() !== 'TODO';
