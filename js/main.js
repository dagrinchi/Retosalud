//Following event is added to the top level navigation bars/tabs
$('div[id="nav1"] a').live(
        'click',
        function() {
            $(this).addClass('ui-btn-active');
            $('div.content_div').hide();
            $('div.def_content_div').hide();
            $('div#' + $(this).attr('data-href')).show();
            //The following line will show the div associated with the default subtab of the current tab (which was clicked)
            //e.g "main" is the default subtab for the "headers" tab.
            $('div#' + $(this).attr('data-href')).children(
                    '[class="def_sub_content_div"]').show();

        });
//Following event is addred to the subtabs navigation bar which will show the div associated with it when clicked.
$('div[id="nav2"] a').live('click', function() {
    $(this).addClass('ui-btn-active');
    $('div.sub_content_div').hide();
    $('div.def_sub_content_div').hide();
    $('div#' + $(this).attr('data-href')).show();
});