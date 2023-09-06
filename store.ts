/* test */
export let store: any = {};

/* production */
if ( typeof window !== 'undefined' ) {
	store = window.localStorage;
}