-- Atomic Order Placement Function with Inventory Management
CREATE OR REPLACE FUNCTION place_order_complete(
    p_user_id UUID,
    p_shipping_address TEXT,
    p_shipping_coordinates GEOGRAPHY,
    p_total_price DECIMAL,
    p_shipping_fee DECIMAL,
    p_order_items JSONB,
    p_payment_slip_url TEXT DEFAULT NULL,
    p_trans_ref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_number VARCHAR;
    v_store_open BOOLEAN;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INTEGER;
    v_current_stock INTEGER;
    v_error_message TEXT;
    v_success BOOLEAN := TRUE;
    v_result JSONB;
BEGIN
    -- Start transaction
    BEGIN
        -- Check if store is open
        SELECT is_store_open INTO v_store_open 
        FROM store_settings 
        LIMIT 1 FOR UPDATE;

        IF NOT v_store_open THEN
            RAISE EXCEPTION 'STORE_CLOSED: Store is currently closed';
        END IF;

        -- Generate order number (YYMMDD-XXXXX)
        v_order_number := TO_CHAR(NOW(), 'YYMMDD') || '-' || 
                         LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');

        -- Validate and update stock for each item
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
        LOOP
            v_product_id := (v_item->>'product_id')::UUID;
            v_quantity := (v_item->>'quantity')::INTEGER;

            -- Check product availability and lock row
            SELECT stock INTO v_current_stock 
            FROM products 
            WHERE id = v_product_id AND is_available = TRUE 
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: Product % is not available', v_product_id;
            END IF;

            IF v_current_stock < v_quantity THEN
                RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product % has only % items in stock', 
                    v_product_id, v_current_stock;
            END IF;

            -- Update stock
            UPDATE products 
            SET stock = stock - v_quantity,
                updated_at = NOW()
            WHERE id = v_product_id;
        END LOOP;

        -- Create order
        INSERT INTO orders (
            user_id,
            order_number,
            shipping_address,
            shipping_coordinates,
            total_price,
            shipping_fee,
            payment_slip_url,
            trans_ref,
            status
        ) VALUES (
            p_user_id,
            v_order_number,
            p_shipping_address,
            p_shipping_coordinates,
            p_total_price,
            p_shipping_fee,
            p_payment_slip_url,
            p_trans_ref,
            'pending'
        ) RETURNING id INTO v_order_id;

        -- Create order items
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        SELECT 
            v_order_id,
            (item->>'product_id')::UUID,
            (item->>'quantity')::INTEGER,
            (item->>'unit_price')::DECIMAL
        FROM jsonb_array_elements(p_order_items) AS item;

        -- Log activity
        INSERT INTO activity_logs (
            user_id,
            action_type,
            table_name,
            record_id,
            new_data
        ) VALUES (
            p_user_id,
            'ORDER_CREATED',
            'orders',
            v_order_id,
            jsonb_build_object(
                'order_number', v_order_number,
                'total_price', p_total_price,
                'items_count', jsonb_array_length(p_order_items)
            )
        );

        -- Return success result
        v_result := jsonb_build_object(
            'success', true,
            'order_id', v_order_id,
            'order_number', v_order_number,
            'message', 'Order placed successfully'
        );

    EXCEPTION
        WHEN OTHERS THEN
            v_success := FALSE;
            v_error_message := SQLERRM;
            
            -- Log error
            INSERT INTO activity_logs (
                user_id,
                action_type,
                error_message
            ) VALUES (
                p_user_id,
                'ORDER_ERROR',
                v_error_message
            );

            v_result := jsonb_build_object(
                'success', false,
                'error', v_error_message
            );
    END;

    RETURN v_result;
END;
$$;

-- Function to calculate shipping distance
CREATE OR REPLACE FUNCTION calculate_shipping_distance(
    customer_coordinates GEOGRAPHY,
    shipping_method VARCHAR DEFAULT 'delivery'
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
    v_store_coordinates GEOGRAPHY;
    v_distance_km DECIMAL;
    v_flat_fee DECIMAL;
BEGIN
    -- Get store coordinates
    SELECT store_coordinates, flat_shipping_fee 
    INTO v_store_coordinates, v_flat_fee
    FROM store_settings 
    LIMIT 1;

    -- If store pickup or no coordinates, return 0
    IF shipping_method = 'pickup' OR customer_coordinates IS NULL THEN
        RETURN 0;
    END IF;

    -- Calculate straight line distance using Haversine formula
    IF v_store_coordinates IS NOT NULL AND customer_coordinates IS NOT NULL THEN
        v_distance_km := ST_Distance(
            v_store_coordinates::geography,
            customer_coordinates::geography
        ) / 1000; -- Convert meters to kilometers
    ELSE
        v_distance_km := 0;
    END IF;

    -- Return flat fee if distance calculation fails
    IF v_distance_km IS NULL OR v_distance_km <= 0 THEN
        RETURN v_flat_fee;
    END IF;

    RETURN v_flat_fee; -- For now, return flat fee. Can be extended to distance-based
END;
$$;

-- Function to verify payment slip with Thunder API
CREATE OR REPLACE FUNCTION verify_payment_slip(
    p_order_id UUID,
    p_trans_ref TEXT,
    p_expected_amount DECIMAL,
    p_slip_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_exists BOOLEAN;
    v_already_verified BOOLEAN;
    v_result JSONB;
    v_thunder_response JSONB;
BEGIN
    -- Check if order exists and not already verified
    SELECT EXISTS(
        SELECT 1 FROM orders 
        WHERE id = p_order_id 
        AND trans_ref IS NULL
    ) INTO v_order_exists;

    IF NOT v_order_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ORDER_NOT_FOUND_OR_ALREADY_VERIFIED'
        );
    END IF;

    -- Check for duplicate transaction reference
    SELECT EXISTS(
        SELECT 1 FROM orders 
        WHERE trans_ref = p_trans_ref
    ) INTO v_already_verified;

    IF v_already_verified THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'DUPLICATE_TRANSACTION_REFERENCE'
        );
    END IF;

    -- Here you would call Thunder Solution API
    -- For now, simulate verification with validation rules
    -- In production, replace with actual API call
    
    -- Simulate API call delay
    PERFORM pg_sleep(0.1);
    
    -- Validation rules (simulate Thunder API response)
    IF p_trans_ref IS NULL OR p_trans_ref = '' THEN
        v_thunder_response := jsonb_build_object(
            'status', 'error',
            'message', 'Invalid transaction reference'
        );
    ELSE
        v_thunder_response := jsonb_build_object(
            'status', 'success',
            'amount', p_expected_amount,
            'verified', true,
            'timestamp', NOW()
        );
    END IF;

    -- Update order if verification successful
    IF (v_thunder_response->>'status') = 'success' THEN
        UPDATE orders 
        SET 
            status = 'paid',
            trans_ref = p_trans_ref,
            thunder_verified = true,
            verified_at = NOW(),
            payment_slip_url = p_slip_url,
            updated_at = NOW()
        WHERE id = p_order_id;

        -- Log verification
        INSERT INTO activity_logs (
            action_type,
            table_name,
            record_id,
            new_data
        ) VALUES (
            'PAYMENT_VERIFIED',
            'orders',
            p_order_id,
            jsonb_build_object(
                'trans_ref', p_trans_ref,
                'amount', p_expected_amount
            )
        );

        v_result := jsonb_build_object(
            'success', true,
            'message', 'Payment verified successfully',
            'order_id', p_order_id
        );
    ELSE
        -- Log failed verification
        INSERT INTO activity_logs (
            action_type,
            table_name,
            record_id,
            error_message
        ) VALUES (
            'PAYMENT_FAILED',
            'orders',
            p_order_id,
            v_thunder_response->>'message'
        );

        v_result := jsonb_build_object(
            'success', false,
            'error', v_thunder_response->>'message'
        );
    END IF;

    RETURN v_result;
END;
$$;

-- Function to get order statistics
CREATE OR REPLACE FUNCTION get_order_statistics(
    p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
    total_orders BIGINT,
    total_revenue DECIMAL,
    avg_order_value DECIMAL,
    pending_orders BIGINT,
    paid_orders BIGINT,
    shipping_orders BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_price + shipping_fee), 0) as total_revenue,
        COALESCE(AVG(total_price + shipping_fee), 0) as avg_order_value,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_orders,
        COUNT(*) FILTER (WHERE status = 'shipping') as shipping_orders
    FROM orders
    WHERE created_at BETWEEN p_start_date AND p_end_date
    AND status NOT IN ('cancelled');
END;
$$;
