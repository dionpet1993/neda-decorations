<?php
/**
 * Plugin Name: Neda — Auto Deploy on Publish
 * Description: Triggers a Cloudflare Pages rebuild whenever a post or project is published or an already-published one is updated.
 */

add_action( 'save_post', function ( $post_id, $post, $update ) {
	if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
		return;
	}
	if ( ! in_array( $post->post_type, [ 'post', 'project' ], true ) ) {
		return;
	}
	if ( $post->post_status !== 'publish' ) {
		return;
	}

	wp_remote_post(
		'https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/867ec5dd-c905-4192-84e6-e7b1a39b8fe1',
		[
			'blocking' => false,
			'timeout'  => 1,
		]
	);
}, 10, 3 );
