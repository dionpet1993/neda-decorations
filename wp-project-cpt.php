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

	register_taxonomy( 'project_category', 'project', [
		'labels' => [
			'name'          => 'Work Categories',
			'singular_name' => 'Work Category',
		],
		'public'            => true,
		'show_in_rest'      => true,
		'rest_base'         => 'project_categories',
		'hierarchical'      => true,
		'show_admin_column' => true,
	] );
} );

// Seed the default filter categories from the mockup once, so the client
// doesn't have to type them in by hand.
add_action( 'init', function () {
	if ( get_option( 'neda_project_categories_seeded' ) ) {
		return;
	}
	foreach ( [ 'Christmas', 'Events', 'Weddings', 'Hospitality', 'Fashion' ] as $term ) {
		if ( ! term_exists( $term, 'project_category' ) ) {
			wp_insert_term( $term, 'project_category' );
		}
	}
	update_option( 'neda_project_categories_seeded', true );
}, 20 );
