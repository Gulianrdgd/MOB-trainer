/** Site- en contactgegevens voor de footer. Een link verdwijnt als de waarde 'TODO' of leeg is. */
export const site = {
	author: 'Julian van der Horst',
	githubUrl: 'https://github.com/Gulianrdgd',
	contactEmail: 'julian@vdhorst.dev'
};

export const isSet = (value: string) => value.trim() !== '' && value.trim() !== 'TODO';
