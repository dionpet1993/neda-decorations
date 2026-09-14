<?php
/**
 * Plugin Name: Neda — Project Portfolio CPT
 * Description: Registers the "Project" custom post type for the portfolio, exposed via the REST API so the Astro site can pull it in as a photo-heavy gallery.
 */

add_action( 'init', function () {
	register_post_type( 'project', [
		'labels' => [
			'name'          => 'Projects',
			'singular_name' => 'Project',
			'add_new_item'  => 'Add New Project',
			'edit_item'     => 'Edit Project',
			'all_items'     => 'All Projects',
		],
		'public'       => true,
		'show_in_rest' => true,
		'rest_base'    => 'projects',
		'menu_icon'    => 'dashicons-portfolio',
		'supports'     => [ 'title', 'editor', 'thumbnail', 'excerpt' ],
		'has_archive'  => false,
		'rewrite'      => [ 'slug' => 'projects' ],
	] );
} );
