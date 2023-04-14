<?php
/**
 * Widget API: WP_Widget_Converter class
 *
 * @package WordPress
 * @subpackage Widgets
 * @since 4.4.0
 */

/**
 * Core class used to implement the Converter widget.
 *
 * @since 2.8.0
 *
 * @see WP_Widget
 */
class WP_Widget_Converter extends WP_Widget
{
    /**
     * Ensure that the ID attribute only appears in the markup once
     *
     * @since 4.4.0
     * @var int
     */
    private static $instance = 0;

    /**
     * Sets up a new Converter widget instance.
     *
     * @since 2.8.0
     */
    public function __construct() {
        $widget_ops = array(
            'classname' => 'widget_converter',
            'description' => __('Simple USD/CZK converter'),
            'customize_selective_refresh' => true,
            'show_instance_in_rest' => true,
        );
        parent::__construct('converter', __('Converter'), $widget_ops);
    }

    /**
     * Outputs the content for the current Converter widget instance.
     *
     * @param array $args Display arguments including 'before_title', 'after_title',
     *                        'before_widget', and 'after_widget'.
     * @param array $instance The settings for the particular instance of the widget.
     * @since 2.8.0
     *
     */
    public function widget($args, $instance) {
        $title = !empty($instance['title']) ? $instance['title'] : '';
        $reactAppName  = !empty($instance['reactAppName']) ? $instance['reactAppName'] : '';

        /** This filter is documented in wp-includes/widgets/class-wp-widget-pages.php */
        $title = apply_filters('widget_title', $title, $instance, $this->id_base);
                echo $args['before_widget'];
        if ($title) {
            printf('<b>%s</b>', $title);
        }
        if (0 === self::$instance) {
            echo '<span id="converter_wrap" class="converter_wrap">';
        } else {
            echo '<span class="converter_wrap">';
        }
        $plugin_app_dir_url = escapeshellcmd(REPR_APPS_URL . "/{$reactAppName}/");
        $react_app_build = $plugin_app_dir_url . 'build/';
        $asset_manifest = $react_app_build.'/asset-manifest.json';
        error_log('Converter.widget(): asset manifest: ' . $asset_manifest);
        try {
            $manifest = json_decode(file_get_contents($asset_manifest), true);
            wp_enqueue_style('rp-react-app-asset-'.$reactAppName, $react_app_build . $manifest['files']['main.css']);
            wp_enqueue_script('rp-react-app-asset-'.$reactAppName, $react_app_build . $manifest['files']['main.js'], array(), '1', true);
            printf(str_replace('root', 'root-'.$reactAppName, REPR_REACT_ROOT_TAG));
        } catch (Exception $e) {
            error_log('Converter.widget(): -- ERROR: caught exception: ' . $e);
        }
        echo '</span>';
        echo $args['after_widget'];

        self::$instance++;
    }

    /**
     * Handles updating settings for the current Converter widget instance.
     *
     * @param array $new_instance New settings for this instance as input by the user via
     *                            WP_Widget::form().
     * @param array $old_instance Old settings for this instance.
     * @return array Updated settings to save.
     * @since 2.8.0
     *
     */
    public function update($new_instance, $old_instance) {
        $instance = $old_instance;
        $instance['title'] = sanitize_text_field($new_instance['title']);
        $instance['reactAppName'] = sanitize_text_field($new_instance['reactAppName']);

        return $instance;
    }

    /**
     * Outputs the settings form for the Converter widget.
     *
     * @param array $instance Current settings.
     * @since 2.8.0
     *
     */
    public function form($instance) {
        $instance = wp_parse_args((array)$instance, array('title' => '', 'reactAppName' => ''));
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php _e('Title:'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>"
                   name="<?php echo $this->get_field_name('title'); ?>" type="text"
                   value="<?php echo esc_attr($instance['title']); ?>"/>
            <label for="<?php echo $this->get_field_id('reactAppName'); ?>"><?php _e('React app name:'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('reactAppName'); ?>"
                   name="<?php echo $this->get_field_name('reactAppName'); ?>" type="text"
                   value="<?php echo esc_attr($instance['reactAppName']); ?>"/>
        </p>
        <?php
    }
}
